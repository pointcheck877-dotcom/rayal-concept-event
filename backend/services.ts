import { db, error, json, requireAuth } from '@appdeploy/sdk';
import type { RouterMiddleware, RouterRoutes } from '@appdeploy/sdk';
import { createHash } from 'node:crypto';

const sections = ['food', 'costume', 'decoration', 'sound'];
const userTable = (userId: string) => 'events_' + createHash('sha256').update(userId).digest('hex').slice(0, 32);
const serviceTable = (userId: string, eventId: string, section: string) => 'services_' + createHash('sha256').update(JSON.stringify([userId, eventId, section])).digest('hex').slice(0, 40);
type ServiceRecord = { name: string; supplier: string; contact: string; quantity: string; cost: string; currency: string; status: string; notes: string; options: string[] };
const fields = ['name', 'supplier', 'contact', 'quantity', 'cost', 'currency', 'status', 'notes'] as const;
function clean(value: unknown): ServiceRecord | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const field of fields) {
    if (typeof input[field] !== 'string') return null;
    const text = (input[field] as string).trim();
    if (text.length > (field === 'notes' ? 2000 : 150)) return null;
    result[field] = text;
  }
  if (!result.name || !['UGX', 'RWF', 'USD'].includes(result.currency) || !['To plan', 'In progress', 'Booked', 'Ready'].includes(result.status)) return null;
  if (result.cost !== '' && (!/^\d+(\.\d{1,2})?$/.test(result.cost) || Number(result.cost) > 1000000000000)) return null;
  const options = input.options === undefined ? [] : input.options;
  if (!Array.isArray(options) || options.length > 20 || options.some(option => typeof option !== 'string' || !option.trim() || option.trim().length > 100)) return null;
  return { ...result, options: [...new Set(options.map(option => option.trim()))] } as ServiceRecord;
}
const eventAccess: RouterMiddleware = async ctx => {
  if (!sections.includes(ctx.params.section)) return error('Unknown planning section', 400);
  const [event] = await db.get(userTable(ctx.user!.userId), [ctx.params.eventId], { consistent: true });
  if (!event) return error('Event not found', 404);
};
export const serviceRoutes: RouterRoutes = {
  'GET /api/events/:eventId/services/:section': [requireAuth(), eventAccess, async ctx => {
    if (ctx.query.nextToken && ctx.query.nextToken.length > 4096) return error('Invalid page token', 400);
    return json(await db.list<ServiceRecord>(serviceTable(ctx.user!.userId, ctx.params.eventId, ctx.params.section), { limit: 50, ...(ctx.query.nextToken ? { nextToken: ctx.query.nextToken } : {}) }));
  }],
  'POST /api/events/:eventId/services/:section': [requireAuth(), eventAccess, async ctx => {
    const record = clean(ctx.body);
    if (!record) return error('Enter a valid item name, cost, currency and status', 400);
    const [id] = await db.add(serviceTable(ctx.user!.userId, ctx.params.eventId, ctx.params.section), [{ ...record, createdAt: new Date().toISOString() }]);
    if (!id) return error('Could not create item', 500);
    return json({ id }, 201);
  }],
  'PUT /api/events/:eventId/services/:section/:id': [requireAuth(), eventAccess, async ctx => {
    const record = clean(ctx.body);
    if (!record) return error('Enter a valid item name, cost, currency and status', 400);
    const [updated] = await db.tx.update(serviceTable(ctx.user!.userId, ctx.params.eventId, ctx.params.section), [{ id: ctx.params.id, record: { ...record, updatedAt: new Date().toISOString() } }], { patch: true });
    return updated ? json({ updated: true }) : error('Item not found', 404);
  }],
  'DELETE /api/events/:eventId/services/:section/:id': [requireAuth(), eventAccess, async ctx => {
    const [deleted] = await db.delete(serviceTable(ctx.user!.userId, ctx.params.eventId, ctx.params.section), [ctx.params.id]);
    return json({ deleted });
  }],
};
