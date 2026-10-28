import { useEffect, useState } from 'react';
import { api } from '@appdeploy/client';
import { Plus, Pencil, Trash2, PackageCheck, Wallet, ListChecks } from 'lucide-react';

export const servicePages: Record<string, { key: string; description: string; example: string }> = {
  'Food & Beverage': { key: 'food', description: 'Plan menus, drinks and catering services for your event.', example: 'e.g. Buffet catering for 100 guests' },
  'Costume': { key: 'costume', description: 'Organize outfits, accessories and costume suppliers.', example: 'e.g. Bridal party outfits' },
  'Decoration': { key: 'decoration', description: 'Bring your event vision to life with flowers, styling and decor.', example: 'e.g. Floral table centerpieces' },
  'Sound System': { key: 'sound', description: 'Coordinate speakers, microphones, lighting and audio suppliers.', example: 'e.g. PA speakers and wireless microphones' },
};

const optionMenus: Record<string, string[]> = {
  food: ['Buffet', 'Plated meals', 'Cocktail bites', 'Snacks', 'Water', 'Soft drinks', 'Juice', 'Tea & coffee'],
  costume: ['Bridal outfits', 'Groom outfits', 'Bridesmaid outfits', 'Traditional wear', 'Performer costumes', 'Staff uniforms', 'Accessories'],
  decoration: ['Floral arrangements', 'Table styling', 'Stage decor', 'Photo backdrop', 'Entrance decor', 'Draping', 'Ambient lighting'],
  sound: ['PA speakers', 'Wireless microphones', 'Audio mixer', 'DJ equipment', 'Live band setup', 'Stage monitors', 'Sound technician'],
};

type ServiceItem = {
  id: string;
  name: string;
  supplier: string;
  contact: string;
  quantity: string;
  cost: string;
  currency: string;
  status: string;
  notes: string;
  options: string[];
};
type Form = Omit<ServiceItem, 'id'>;
const blank: Form = { name: '', supplier: '', contact: '', quantity: '', cost: '', currency: 'UGX', status: 'To plan', notes: '', options: [] };

export default function Services({ title, eventId, eventName }: { title: string; eventId: string; eventName?: string }) {
  const config = servicePages[title];
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [opened, setOpened] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({ ...blank });
  const [customOption, setCustomOption] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All statuses');
  const path = '/api/events/' + encodeURIComponent(eventId) + '/services/' + config.key;
  const load = async (cursor?: string) => {
    if (!eventId) return;
    setLoading(true); setError('');
    try {
      const response = await api.get(path + (cursor ? '?nextToken=' + encodeURIComponent(cursor) : ''));
      setItems(previous => cursor ? [...previous, ...response.data.items] : response.data.items);
      setNextToken(response.data.nextToken);
    } catch { setError('Could not load these items. Please try again.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [eventId, title]);
  const open = (item?: ServiceItem) => {
    setEditing(item?.id || null);
    setForm(item ? { name: item.name, supplier: item.supplier, contact: item.contact, quantity: item.quantity, cost: item.cost, currency: item.currency, status: item.status, notes: item.notes, options: item.options || [] } : { ...blank, options: [] });
    setCustomOption('');
    setError(''); setSuccess(''); setOpened(true);
  };
  const toggleOption = (option: string) => {
    setForm(previous => ({
      ...previous,
      options: previous.options.includes(option)
        ? previous.options.filter(value => value !== option)
        : previous.options.length < 20 ? [...previous.options, option] : previous.options,
    }));
  };
  const addCustomOption = () => {
    const option = customOption.trim();
    if (!option) return;
    if (form.options.length >= 20) { setError('Choose up to 20 options per item.'); return; }
    if (!form.options.includes(option)) setForm(previous => ({ ...previous, options: [...previous.options, option] }));
    setCustomOption('');
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) { setError('Please enter an item name.'); return; }
    setSaving(true); setError('');
    try {
      if (editing) await api.put(path + '/' + encodeURIComponent(editing), form);
      else await api.post(path, form);
      setOpened(false); setSuccess(editing ? 'Item updated successfully.' : 'Item added to your event.');
      await load();
    } catch { setError('Could not save this item. Check the details and try again.'); }
    finally { setSaving(false); }
  };
  const remove = async (item: ServiceItem) => {
    if (!window.confirm('Delete ' + item.name + ' from this event?')) return;
    setSaving(true); setError(''); setSuccess('');
    try { await api.delete(path + '/' + encodeURIComponent(item.id)); setSuccess('Item deleted.'); await load(); }
    catch { setError('Could not delete this item. Please try again.'); }
    finally { setSaving(false); }
  };
  const visible = items.filter(item => (filter === 'All statuses' || item.status === filter) && (item.name + ' ' + item.supplier + ' ' + (item.options || []).join(' ')).toLowerCase().includes(search.toLowerCase()));
  const totals = items.reduce<Record<string, number>>((result, item) => { if (item.cost !== '') result[item.currency] = (result[item.currency] || 0) + Number(item.cost); return result; }, {});
  const format = (amount: number, currency: string) => currency + ' ' + amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return <section className="services-page">
    {!eventId ? <div className="panel empty"><PackageCheck size={32} /><h3>Choose your event</h3><p>Select an event above to start planning {title.toLowerCase()}.</p></div> : <>
      <div className="service-summary">
        <article><ListChecks size={21}/><div><small>ITEMS LOADED</small><strong>{items.length}</strong></div></article>
        <article><PackageCheck size={21}/><div><small>READY</small><strong>{items.filter(item => item.status === 'Ready').length}</strong></div></article>
        <article><Wallet size={21}/><div><small>PLANNED TOTAL · LOADED ITEMS</small><strong className="service-cost">{Object.entries(totals).length ? Object.entries(totals).map(([currency, value]) => format(value, currency)).join(' / ') : 'No costs added'}</strong></div></article>
      </div>
      <div className="panel">
        <div className="panel-head"><div><span className="eyebrow">EVENT PREPARATIONS</span><h3>{title}</h3><p>{config.description}</p></div><button className="gold-button" onClick={() => open()}><Plus size={16}/> Add item</button></div>
        {success && <div className="notice" role="status">{success}</div>}
        {error && !opened && <div className="service-error" role="alert">{error}<button className="outline" onClick={() => void load()}>Try again</button></div>}
        <div className="service-toolbar"><input aria-label="Search items" placeholder="Search items or suppliers" value={search} onChange={event => setSearch(event.target.value)}/><select aria-label="Filter by status" value={filter} onChange={event => setFilter(event.target.value)}>{['All statuses', 'To plan', 'In progress', 'Booked', 'Ready'].map(status => <option key={status}>{status}</option>)}</select></div>
        {loading && items.length === 0 ? <p role="status">Loading your preparations…</p> : visible.length === 0 ? <div className="empty"><PackageCheck size={30}/><h3>{items.length ? 'No matching items' : 'Let’s prepare your event'}</h3><p>{items.length ? 'Try a different search or status.' : 'Add your first item, supplier and planned cost.'}</p></div> : <div className="service-cards">{visible.map(item => <article className="service-card" key={item.id}>
          <div className="panel-head"><span className={'service-badge status-' + item.status.toLowerCase().replace(/ /g, '-')}>{item.status}</span><div className="service-actions"><button className="delete" aria-label={'Edit ' + item.name} onClick={() => open(item)}><Pencil size={16}/></button><button className="delete" disabled={saving} aria-label={'Delete ' + item.name} onClick={() => void remove(item)}><Trash2 size={16}/></button></div></div>
          <h3>{item.name}</h3><p>{item.supplier || 'Supplier not assigned'}</p>{item.contact && <p className="service-contact">{item.contact}</p>}
          <dl><div><dt>Quantity / details</dt><dd>{item.quantity || 'Not specified'}</dd></div><div><dt>Planned total cost</dt><dd>{item.cost === '' ? 'Not specified' : format(Number(item.cost), item.currency)}</dd></div></dl>
          <details className="item-option-menu">
            <summary>{title === 'Food & Beverage' ? 'Food & beverage menu' : 'Service options'} <span>{(item.options || []).length}</span></summary>
            {(item.options || []).length ? <ul>{item.options.map(option => <li key={option}>{option}</li>)}</ul> : <p>No options selected. Edit this item to add them.</p>}
          </details>
          {item.notes && <p className="service-notes">{item.notes}</p>}
        </article>)}</div>}
        {nextToken && <button className="outline service-more" disabled={loading} onClick={() => void load(nextToken)}>{loading ? 'Loading…' : 'Load more items'}</button>}
      </div>
    </>}
    {opened && <div className="overlay"><form className="dialog" onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="service-dialog-title"><div className="panel-head"><div><span className="eyebrow">{title.toUpperCase()}</span><h3 id="service-dialog-title">{editing ? 'Edit item' : 'Add item'}</h3></div><button type="button" className="close" disabled={saving} aria-label="Close form" onClick={() => setOpened(false)}>×</button></div><p>For {eventName}</p>
      <label>Item name<input required maxLength={150} value={form.name} placeholder={config.example} onChange={event => setForm({ ...form, name: event.target.value })}/></label>
      <fieldset className="service-option-picker">
        <legend>{title === 'Food & Beverage' ? 'Food & beverage menu' : 'Service options'}</legend>
        <p>Choose all that apply, or add your own. Up to 20 options.</p>
        <div className="option-checkboxes">
          {[...new Set([...optionMenus[config.key], ...form.options])].map(option => <label className="option-checkbox" key={option}><input type="checkbox" checked={form.options.includes(option)} disabled={!form.options.includes(option) && form.options.length >= 20} onChange={() => toggleOption(option)}/><span>{option}</span></label>)}
        </div>
        <div className="custom-option-input"><input aria-label="Custom service option" maxLength={100} placeholder="Add a custom option" value={customOption} onChange={event => setCustomOption(event.target.value)}/><button type="button" className="outline" disabled={!customOption.trim() || form.options.length >= 20} onClick={addCustomOption}>Add option</button></div>
      </fieldset>
      <label>Supplier / provider<input maxLength={150} value={form.supplier} onChange={event => setForm({ ...form, supplier: event.target.value })}/></label>
      <label>Supplier contact<input maxLength={150} placeholder="Phone number or email" value={form.contact} onChange={event => setForm({ ...form, contact: event.target.value })}/></label>
      <label>Quantity / details<input maxLength={150} placeholder="e.g. 100 meals or 4 microphones" value={form.quantity} onChange={event => setForm({ ...form, quantity: event.target.value })}/></label>
      <div className="service-form-grid"><label>Planned total cost<input type="number" min="0" max="1000000000000" step="0.01" value={form.cost} onChange={event => setForm({ ...form, cost: event.target.value })}/></label><label>Currency<select value={form.currency} onChange={event => setForm({ ...form, currency: event.target.value })}>{['UGX','RWF','USD'].map(currency => <option key={currency}>{currency}</option>)}</select></label></div>
      <label>Status<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>{['To plan', 'In progress', 'Booked', 'Ready'].map(status => <option key={status}>{status}</option>)}</select></label>
      <label>Notes<textarea maxLength={2000} rows={3} value={form.notes} placeholder="Delivery times, special requests or setup details" onChange={event => setForm({ ...form, notes: event.target.value })}/></label>
      {error && <p role="alert" className="service-error">{error}</p>}
      <button className="gold-button" disabled={saving} type="submit">{saving ? 'Saving…' : 'Save item'}</button>
    </form></div>}
  </section>;
}
