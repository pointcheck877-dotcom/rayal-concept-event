import { useEffect, useState } from 'react';
import { api } from '@appdeploy/client';
import { Html5Qrcode } from 'html5-qrcode';

type Guest = { id: string; name: string; tableId?: string; checkedInAt?: string };
type Table = { id: string; name: string };
type Result = { status: string; guestId?: string; name?: string; tableId?: string; checkedInAt?: string };

export default function CheckIn({ eventId, guests, tables, onChange }: { eventId: string; guests: Guest[]; tables: Table[]; onChange: () => void }) {
  const [token, setToken] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState('');
  const validate = async (value: string) => {
    if (!eventId || !value.trim()) return;
    setBusy(true); setIssue(''); setResult(null);
    try {
      const response = await api.post('/api/invitations/validate', { eventId, token: value.trim() });
      setResult(response.data);
    } catch { setIssue('Unable to validate this code. Check your connection and try again.'); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (!camera) return;
    const scanner = new Html5Qrcode('royal-scanner');
    let started = false;
    let stopped = false;
    scanner.start({ facingMode: 'environment' }, { fps: 8, qrbox: { width: 220, height: 220 } }, value => {
      if (stopped) return;
      stopped = true;
      setToken(value);
      void validate(value);
      setCamera(false);
    }, () => {}).then(() => { started = true; if (stopped) void scanner.stop().catch(() => {}); }).catch(() => { setIssue('Camera unavailable. Allow camera access or use a manual search.'); setCamera(false); });
    return () => { stopped = true; if (started) void scanner.stop().catch(() => {}); };
  }, [camera, eventId]);
  const confirm = async (guestId: string, rawToken?: string) => {
    if (!window.confirm('Confirm this guest has arrived?')) return;
    setBusy(true); setIssue('');
    try {
      const response = await api.post('/api/check-in', { eventId, guestId, ...(rawToken ? { token: rawToken } : {}) });
      setResult(response.data);
      onChange();
    } catch { setIssue('Could not confirm check-in. Refresh and try again.'); }
    finally { setBusy(false); }
  };
  const matches = search.trim() ? guests.filter(g => g.name.toLowerCase().includes(search.trim().toLowerCase())) : [];
  return <div className="checkin-panel">
    <h3>Entrance check-in</h3>
    <p>Select an event, scan a guest QR code, then confirm their arrival. You can also search by name.</p>
    {!eventId ? <p>Select an event first.</p> : <>
      <button className="outline" type="button" onClick={() => { setCamera(!camera); setIssue(''); }}>{camera ? 'Stop camera' : 'Open camera scanner'}</button>
      {camera && <div id="royal-scanner" className="scanner" />}
      <div className="checkin-input"><input aria-label="Invitation code" value={token} onChange={e => setToken(e.target.value)} placeholder="Paste invitation code"/><button className="outline" disabled={busy || !token.trim()} onClick={() => validate(token)}>Validate code</button></div>
      {issue && <p role="alert">{issue}</p>}
      {result && <div className="checkin-result" role="status"><strong>{result.status === 'valid' ? 'Valid invitation' : result.status === 'checked_in' ? 'Already checked in' : result.status === 'success' ? 'Check-in confirmed' : result.status === 'wrong_event' ? 'Wrong event' : 'Invalid or unavailable invitation'}</strong>{result.name && <p>{result.name} · {tables.find(t => t.id === result.tableId)?.name || 'No table assigned'}</p>}{result.checkedInAt && <p>Checked in: {new Date(result.checkedInAt).toLocaleString()}</p>}{result.status === 'valid' && result.guestId && <button className="gold-button" disabled={busy} onClick={() => confirm(result.guestId!, token)}>Confirm check-in</button>}</div>}
      <h3>Find a guest</h3><input aria-label="Search guests" placeholder="Search by guest name" value={search} onChange={e => setSearch(e.target.value)} />
      {matches.map(g => <div className="row" key={g.id}><div><strong>{g.name}</strong><small>{tables.find(t => t.id === g.tableId)?.name || 'No table assigned'} · {g.checkedInAt ? 'Checked in' : 'Not checked in'}</small></div><button className="outline" disabled={busy || !!g.checkedInAt} onClick={() => confirm(g.id)}>Check in</button></div>)}
    </>}
  </div>;
}
