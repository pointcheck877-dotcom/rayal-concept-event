import { useEffect, useState } from 'react';
import { api, auth } from '@appdeploy/client';
import { QRCodeCanvas } from 'qrcode.react';
import CheckIn from './CheckIn';
import Services, { servicePages } from './Services';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Armchair,
  QrCode,
  Plus,
  LogOut,
  ArrowRight,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  Shirt,
  Flower2,
  Volume2,
} from 'lucide-react';

type Item = {
  id: string;
  name: string;
  eventId?: string;
  date?: string;
  venue?: string;
  category?: string;
  capacity?: string;
  tableId?: string;
  checkedInAt?: string;
};
type Kind = 'events' | 'guests' | 'tables';
const labels: Record<Kind, string> = {
  events: 'Events',
  guests: 'Guests',
  tables: 'Tables',
};
function App() {
  const [signed, setSigned] = useState(auth.isSignedIn());
  const [section, setSection] = useState('Overview');
  const [data, setData] = useState<Record<Kind, Item[]>>({
    events: [],
    guests: [],
    tables: [],
  });
  const [eventId, setEventId] = useState('');
  const [modal, setModal] = useState<Kind | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [qr, setQr] = useState<{ token: string; guestName: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const generateQr = async (guest: Item) => {
    setGenerating(true);
    setQr(null);
    try {
      const result = await api.post('/api/invitations', { guestId: guest.id, eventId });
      setQr({ token: result.data.token, guestName: guest.name });
    } catch {
      setMessage('Could not generate the invitation. Please try again.');
    } finally {
      setGenerating(false);
    }
  };
  const downloadQr = () => {
    const canvas = document.getElementById('guest-qr') as HTMLCanvasElement | null;
    if (!canvas || !qr) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'royal-concept-guest-qr.png';
    link.click();
  };
  const load = async () => {
    setLoading(true);
    try {
      const [events, guests, tables] = await Promise.all(
        ['events', 'guests', 'tables'].map(k => api.get('/api/data/' + k))
      );
      setData({
        events: events.data.items,
        guests: guests.data.items,
        tables: tables.data.items,
      });
      setEventId(old => old || events.data.items[0]?.id || '');
    } catch {
      setMessage('We could not load your data. Please try again.');
    }
    setLoading(false);
  };
  useEffect(() => {
    if (signed) void load();
  }, [signed]);
  const login = async () => {
    try {
      await auth.signIn();
      setSigned(true);
      setMessage('');
    } catch {
      setMessage(
        'Sign-in was not completed. Please allow pop-ups and try again.'
      );
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    if (modal !== 'events' && !eventId) {
      setMessage('Create and select an event first.');
      return;
    }
    try {
      await api.post('/api/data/' + modal, {
        ...form,
        ...(modal !== 'events' ? { eventId } : {}),
      });
      setModal(null);
      setForm({});
      setMessage('Saved successfully.');
      await load();
    } catch {
      setMessage('Could not save your changes. Please try again.');
    }
  };
  const remove = async (kind: Kind, item: Item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;
    try {
      await api.delete(`/api/data/${kind}/${item.id}`);
      if (kind === 'events' && item.id === eventId) setEventId('');
      await load();
    } catch {
      setMessage('Could not delete this item.');
    }
  };
  const guests = data.guests.filter(x => x.eventId === eventId);
  const tables = data.tables.filter(x => x.eventId === eventId);
  const active = data.events.find(x => x.id === eventId);
  const exportAttendance = () => {
    const escape = (value: string) => {
      const safe = /^[=+@\-\t\r]/.test(value) ? "'" + value : value;
      return '"' + safe.replace(/"/g, '""') + '"';
    };
    const rows = [['Guest', 'Category', 'Table', 'Checked in'], ...guests.map(g => [g.name, g.category || 'Standard', tables.find(t => t.id === g.tableId)?.name || '', g.checkedInAt || ''])];
    const csv = rows.map(row => row.map(escape).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'royal-concept-attendance.csv'; link.click(); URL.revokeObjectURL(url);
  };
  const open = (kind: Kind) => {
    setForm({});
    setModal(kind);
    setMessage('');
  };
  if (!signed)
    return (
      <div className="welcome">
        <div className="welcome-inner">
          <img className="company-logo" src="./resources/company-logo.png" alt="Royal Concept company logo" />
          <div className="eyebrow">ROYAL CONCEPT EVENT</div>
          <h1>
            Every great event
            <br />
            <em>begins with a plan.</em>
          </h1>
          <p>
            A thoughtful space for organizing your events, guests and tables
            with confidence.
          </p>
          <button className="gold-button" onClick={login}>
            Sign in to your workspace <ArrowRight size={18} />
          </button>
          {message && <p role="alert">{message}</p>}
          <div className="welcome-foot">EVENT PLANNING, ELEVATED</div>
        </div>
      </div>
    );
  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <img className="company-logo" src="./resources/company-logo.png" alt="Royal Concept company logo" />
          <div>
            <strong>ROYAL CONCEPT</strong>
            <small>EVENT MANAGEMENT</small>
          </div>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav>
          {[
            ['Overview', LayoutDashboard],
            ['Events', CalendarDays],
            ['Guests', Users],
            ['Tables', Armchair],
            ['QR & Check-in', QrCode],
            ['Food & Beverage', UtensilsCrossed],
            ['Costume', Shirt],
            ['Decoration', Flower2],
            ['Sound System', Volume2],
          ].map(([name, Icon]) => (
            <button
              key={name as string}
              className={section === name ? 'active' : ''}
              onClick={() => setSection(name as string)}
            >
              <Icon size={18} />
              {name as string}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          <div className="side-card">
            <Sparkles size={18} />
            <b>Make every moment matter.</b>
            <span>Your planning workspace, all in one place.</span>
          </div>
          <button
            className="signout"
            onClick={async () => {
              await auth.signOut();
              setSigned(false);
              setData({ events: [], guests: [], tables: [] });
              setEventId('');
            }}
          >
            {' '}
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>
      <main data-page={section}>
        <header>
          <div>
            <span className="eyebrow">YOUR EVENT WORKSPACE</span>
            <h2>
              {section === 'Overview' ? 'Welcome to Royal Concept' : section}
            </h2>
            <p>
              {servicePages[section] ? servicePages[section].description : section === 'Overview'
                ? 'Your events, guests and arrivals — beautifully organized.'
                : section === 'Events'
                  ? 'Create memorable occasions and keep every detail in one place.'
                  : section === 'Guests'
                    ? 'A thoughtful welcome starts with an organized guest list.'
                    : section === 'Tables'
                      ? 'Plan a comfortable place for every guest.'
                      : 'Personal invitations. A seamless welcome at the entrance.'}
            </p>
          </div>
          <button className="gold-button" onClick={() => open('events')}>
            <Plus size={17} /> New event
          </button>
        </header>
        {message && (
          <div className="notice" role="status">
            {message}
            <button onClick={() => setMessage('')}>×</button>
          </div>
        )}
        <div className="event-select">
          <div>
            <span>YOUR SELECTED EVENT</span>
            <strong>{active?.name || 'No event selected'}</strong>
          </div>
          <select
            aria-label="Select event"
            value={eventId}
            onChange={e => { setEventId(e.target.value); setQr(null); }}
          >
            <option value="">Select an event</option>
            {data.events.map(x => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
        {loading ? (
          <p>Loading your workspace…</p>
        ) : section === 'Overview' ? (
          <>
            <div className="stats">
              <article>
                <span>YOUR EVENTS</span>
                <strong>{data.events.length}</strong>
                <small>Events created</small>
              </article>
              <article>
                <span>GUESTS</span>
                <strong>{guests.length}</strong>
                <small>For selected event</small>
              </article>
              <article>
                <span>TABLES</span>
                <strong>{tables.length}</strong>
                <small>For selected event</small>
              </article>
              <article>
                <span>SEAT CAPACITY</span>
                <strong>
                  {tables.reduce((n, t) => n + (Number(t.capacity) || 0), 0)}
                </strong>
                <small>Across your tables</small>
              </article>
            </div>
            <div className="panel" style={{ marginTop: 20 }}><div className="panel-head"><div><span className="eyebrow">ATTENDANCE</span><h3>{guests.filter(g => g.checkedInAt).length} checked in</h3><p>{guests.filter(g => !g.checkedInAt).length} guests not yet checked in</p></div><button className="outline" disabled={!eventId} onClick={exportAttendance}>Download attendance CSV</button></div></div>
            <div className="grid">
              <div className="panel">
                <div className="panel-head">
                  <div>
                    <span className="eyebrow">GET STARTED</span>
                    <h3>Your planning checklist</h3>
                  </div>
                </div>
                <p>Bring your event together, one simple step at a time.</p>
                <div className="steps">
                  <button onClick={() => open('events')}>
                    <span>01</span>
                    <div>
                      <b>Create your event</b>
                      <small>Add the details that make it yours</small>
                    </div>
                    <Plus size={17} />
                  </button>
                  <button onClick={() => open('tables')}>
                    <span>02</span>
                    <div>
                      <b>Set up your tables</b>
                      <small>Plan your seating categories</small>
                    </div>
                    <Plus size={17} />
                  </button>
                  <button onClick={() => open('guests')}>
                    <span>03</span>
                    <div>
                      <b>Add your guests</b>
                      <small>Keep your guest list in one place</small>
                    </div>
                    <Plus size={17} />
                  </button>
                </div>
              </div>
              <div className="feature">
                <span className="eyebrow">THE ROYAL EXPERIENCE</span>
                <h3>
                  Thoughtful planning.
                  <br />
                  <em>Memorable moments.</em>
                </h3>
                <p>
                  Keep track of the details, so you can focus on creating an
                  exceptional experience.
                </p>
                <div className="ornament">✦</div>
              </div>
            </div>
          </>
        ) : servicePages[section] ? (
          <Services key={eventId + section} title={section} eventId={eventId} eventName={active?.name} />
        ) : section === 'QR & Check-in' ? (
          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">GUEST INVITATIONS</span>
                <h3>Generate a guest QR code</h3>
              </div>
              <QrCode size={28} />
            </div>
            <p>Select an event above and generate a unique code for a guest. Download it before leaving this page; its secret code cannot be recovered later.</p>
            <p>At the entrance, scan the code and confirm the guest’s arrival below.</p>
            {!active ? <div className="empty">Select an event first.</div> : guests.length === 0 ? <div className="empty">Add guests to this event to create their QR codes.</div> : (
              <div className="list">
                {guests.map(guest => (
                  <div className="row" key={guest.id}>
                    <div><strong>{guest.name}</strong><small>{guest.category || 'Standard'}</small></div>
                    <button className="outline" disabled={generating} onClick={() => generateQr(guest)}>Generate QR</button>
                  </div>
                ))}
              </div>
            )}
            <CheckIn key={eventId} eventId={eventId} guests={guests} tables={tables} onChange={() => void load()} />
            {qr && (
              <div className="qr-preview">
                <h3>Invitation for {qr.guestName}</h3>
                <p>{active?.name} · {active?.date || 'Date to be announced'}</p>
                <QRCodeCanvas id="guest-qr" value={qr.token} size={240} marginSize={4} />
                <p>Save this QR code now. Generating another code creates a new invitation.</p>
                <button className="gold-button" onClick={downloadQr}>Download QR code</button>
              </div>
            )}
          </div>
        ) : (
          <div className="panel">
            <div className="panel-head">
              <div>
                <span className="eyebrow">
                  MANAGE YOUR {section.toUpperCase()}
                </span>
                <h3>{section}</h3>
              </div>
              <button
                className="outline"
                onClick={() => open(section.toLowerCase() as Kind)}
              >
                <Plus size={16} /> Add{' '}
                {section === 'Events'
                  ? 'event'
                  : section === 'Guests'
                    ? 'guest'
                    : 'table'}
              </button>
            </div>
            {(section === 'Events'
              ? data.events
              : section === 'Guests'
                ? guests
                : tables
            ).length === 0 ? (
              <div className="empty">
                <h3>Nothing here yet</h3>
                <p>
                  {section === 'Events'
                    ? 'Create your first event to get started.'
                    : 'Select an event, then add your first ' +
                      section.toLowerCase().slice(0, -1) +
                      '.'}
                </p>
              </div>
            ) : (
              <div className="list">
                {(section === 'Events'
                  ? data.events
                  : section === 'Guests'
                    ? guests
                    : tables
                ).map(item => (
                  <div className="row" key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {section === 'Events'
                          ? [item.date, item.venue].filter(Boolean).join(' · ')
                          : section === 'Guests'
                            ? [
                                item.category,
                                item.checkedInAt ? 'Checked in' : 'Not checked in',
                                tables.find(t => t.id === item.tableId)?.name,
                              ]
                                .filter(Boolean)
                                .join(' · ')
                            : [
                                item.category,
                                item.capacity ? item.capacity + ' seats' : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                      </small>
                    </div>
                    <button
                      aria-label={'Delete ' + item.name}
                      className="delete"
                      onClick={() =>
                        remove(section.toLowerCase() as Kind, item)
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      {modal && (
        <div className="overlay">
          <form className="dialog" onSubmit={save}>
            <div className="panel-head">
              <div>
                <span className="eyebrow">LET'S GET ORGANIZED</span>
                <h3>Add {modal.slice(0, -1)}</h3>
              </div>
              <button
                type="button"
                className="close"
                onClick={() => setModal(null)}
              >
                ×
              </button>
            </div>
            {modal !== 'events' && (
              <p>For: {active?.name || 'Please select an event first'}</p>
            )}
            <label>
              Name
              <input
                required
                value={form.name || ''}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder={
                  modal === 'events'
                    ? 'e.g. A beautiful wedding'
                    : modal === 'tables'
                      ? 'e.g. VIP Table 1'
                      : 'Guest name'
                }
              />
            </label>
            {modal === 'events' && (
              <>
                <label>
                  Date
                  <input
                    type="date"
                    value={form.date || ''}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                  />
                </label>
                <label>
                  Venue
                  <input
                    value={form.venue || ''}
                    onChange={e => setForm({ ...form, venue: e.target.value })}
                    placeholder="Event location"
                  />
                </label>
              </>
            )}
            {modal !== 'events' && (
              <label>
                Category
                <select
                  value={form.category || 'Standard'}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                >
                  <option>Standard</option>
                  <option>VIP</option>
                  <option>VVIP</option>
                  <option>Reserved</option>
                  <option>Accessible</option>
                </select>
              </label>
            )}
            {modal === 'tables' && (
              <label>
                Number of seats
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={form.capacity || ''}
                  onChange={e => setForm({ ...form, capacity: e.target.value })}
                />
              </label>
            )}
            {modal === 'guests' && (
              <label>
                Assign table
                <select
                  value={form.tableId || ''}
                  onChange={e => setForm({ ...form, tableId: e.target.value })}
                >
                  <option value="">Not assigned</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button className="gold-button" type="submit">
              Save {modal.slice(0, -1)}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
export default App;
