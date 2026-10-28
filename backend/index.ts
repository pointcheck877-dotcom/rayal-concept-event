import { router, json, error, requireAuth, db } from '@appdeploy/sdk';
import { createHash, randomBytes } from 'node:crypto';
import { serviceRoutes } from './services';

const table = (userId: string, kind: string) => `${kind}_${createHash('sha256').update(userId).digest('hex').slice(0, 32)}`;
const kinds = ['events', 'guests', 'tables'];
type Guest = { name: string; eventId: string; tableId?: string; checkedInAt?: string };
type Invitation = { eventId: string; guestId: string; tokenHash?: string; revoked?: boolean; expiresAt?: string };
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
async function findInvitation(userId: string, token: string): Promise<Invitation | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const hash = digest(token);
  const [found] = await db.get<Invitation>(table(userId, 'invitations'), [hash], { consistent: true });
  if (found) return found;
  // Previous versions used generated database IDs; support the first page of older invitations.
  const legacy = await db.list<Invitation>(table(userId, 'invitations'), { limit: 100 });
  return legacy.items.find(item => item.tokenHash === hash) || null;
}
async function validate(userId: string, eventId: string, token: string) {
  const invitation = await findInvitation(userId, token);
  if (!invitation || invitation.revoked || (invitation.expiresAt && Date.parse(invitation.expiresAt) <= Date.now())) return { status: 'invalid' };
  if (invitation.eventId !== eventId) return { status: 'wrong_event' };
  const [event] = await db.get(table(userId, 'events'), [eventId], { consistent: true });
  const [guest] = await db.get<Guest>(table(userId, 'guests'), [invitation.guestId], { consistent: true });
  if (!event || !guest || guest.eventId !== eventId) return { status: 'invalid' };
  return { status: guest.checkedInAt ? 'checked_in' : 'valid', guestId: invitation.guestId, name: guest.name, tableId: guest.tableId, checkedInAt: guest.checkedInAt };
}
export const handler = router({
  ...serviceRoutes,
  'POST /api/invitations': [requireAuth(), async ctx => {
    const body = ctx.body as { eventId?: string; guestId?: string };
    if (!body || typeof body.eventId !== 'string' || typeof body.guestId !== 'string') return error('Select an event and guest', 400);
    const [event] = await db.get(table(ctx.user!.userId, 'events'), [body.eventId], { consistent: true });
    const [guest] = await db.get<Guest>(table(ctx.user!.userId, 'guests'), [body.guestId], { consistent: true });
    if (!event || !guest || guest.eventId !== body.eventId) return error('Guest does not belong to this event', 404);
    const token = randomBytes(32).toString('base64url');
    const [id] = await db.tx.add(table(ctx.user!.userId, 'invitations'), [{ id: digest(token), eventId: body.eventId, guestId: body.guestId, createdAt: new Date().toISOString() }]);
    if (!id) return error('Could not create invitation', 500);
    return json({ token });
  }],
  'POST /api/invitations/validate': [requireAuth(), async ctx => {
    const body = ctx.body as { eventId?: string; token?: string };
    if (!body || typeof body.eventId !== 'string' || typeof body.token !== 'string') return error('Select an event and provide a code', 400);
    return json(await validate(ctx.user!.userId, body.eventId, body.token));
  }],
  'POST /api/check-in': [requireAuth(), async ctx => {
    const body = ctx.body as { eventId?: string; guestId?: string; token?: string };
    if (!body || typeof body.eventId !== 'string' || typeof body.guestId !== 'string') return error('Select an event and guest', 400);
    const userId = ctx.user!.userId;
    if (body.token) {
      const result = await validate(userId, body.eventId, body.token);
      if (result.status !== 'valid' || result.guestId !== body.guestId) return json(result);
    }
    const [event] = await db.get(table(userId, 'events'), [body.eventId], { consistent: true });
    const [guest] = await db.get<Guest>(table(userId, 'guests'), [body.guestId], { consistent: true });
    if (!event || !guest || guest.eventId !== body.eventId) return json({ status: 'invalid' });
    if (guest.checkedInAt) return json({ status: 'checked_in', name: guest.name, checkedInAt: guest.checkedInAt, tableId: guest.tableId });
    const checkedInAt = new Date().toISOString();
    const [updated] = await db.tx.update(table(userId, 'guests'), [{ id: body.guestId, record: { checkedInAt, checkedInBy: userId }, if: { checkedInAt: undefined, eventId: body.eventId } }], { patch: true });
    if (!updated) return json({ status: 'checked_in', name: guest.name, tableId: guest.tableId });
    return json({ status: 'success', name: guest.name, tableId: guest.tableId, checkedInAt });
  }],
  'GET /api/data/:kind': [requireAuth(), async ctx => {
    if (!kinds.includes(ctx.params.kind)) return error('Invalid category', 400);
    return json(await db.list(table(ctx.user!.userId, ctx.params.kind), { limit: 100 }));
  }],
  'POST /api/data/:kind': [requireAuth(), async ctx => {
    if (!kinds.includes(ctx.params.kind)) return error('Invalid category', 400);
    const value = ctx.body as Record<string, unknown>;
    if (!value || typeof value.name !== 'string' || !value.name.trim()) return error('A name is required', 400);
    const safe = { name: value.name.trim(), eventId: value.eventId, date: value.date, venue: value.venue, category: value.category, capacity: value.capacity, tableId: value.tableId };
    const [id] = await db.add(table(ctx.user!.userId, ctx.params.kind), [safe]);
    if (!id) return error('Unable to save', 500);
    return json({ id });
  }],
  'DELETE /api/data/:kind/:id': [requireAuth(), async ctx => {
    if (!kinds.includes(ctx.params.kind)) return error('Invalid category', 400);
    const [deleted] = await db.delete(table(ctx.user!.userId, ctx.params.kind), [ctx.params.id]);
    return json({ deleted });
  }],
});
