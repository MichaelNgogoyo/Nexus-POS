import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { searchCustomers } from '../../services/api.js';

export default function POSCustomers() {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(null);
    const results = useQuery({
        queryKey: ['pos-customers', query.trim()],
        queryFn: () => searchCustomers(query.trim()).then(({ data }) => data),
        enabled: query.trim().length >= 2,
    });

    return <section className="pos-data-page">
        <header className="pos-page-heading"><div><p className="hotel-eyebrow">SERVICE</p><h1>Guest lookup</h1><p>Search guest records by name or phone number.</p></div></header>
        <label className="pos-search-field"><SearchRoundedIcon /><input autoComplete="off" value={query} onChange={(event) => { setQuery(event.target.value); setSelected(null); }} placeholder="Type at least two characters" /></label>
        {results.isFetching && <div className="pos-state">Searching guest records…</div>}
        {results.isError && <div className="pos-error" role="alert">Guest records could not be loaded. <button onClick={() => results.refetch()}><RefreshRoundedIcon /> Try again</button></div>}
        {query.trim().length < 2 && <div className="pos-state"><PeopleAltRoundedIcon /><strong>Search to find a guest</strong><span>Guest data comes from the Java customer API.</span></div>}
        {results.isSuccess && !results.isFetching && (results.data?.length ? <div className="pos-record-grid">{results.data.map((customer) => <button key={customer.id} className={`pos-record-card ${selected?.id === customer.id ? 'selected' : ''}`} onClick={() => setSelected(customer)}><span className="pos-record-avatar">{customer.name?.slice(0, 1)?.toUpperCase() || '?'}</span><span><strong>{customer.name || 'Unnamed guest'}</strong><small>{customer.phone || customer.email || 'No contact details'}</small></span></button>)}</div> : <div className="pos-state">No matching guest records.</div>)}
        {selected && <div className="pos-selection-bar"><div><strong>{selected.name}</strong><span>{selected.phone || selected.email || 'No contact details on file'}</span></div><button className="pos-secondary-action" onClick={() => setSelected(null)}>Clear selection</button></div>}
    </section>;
}
