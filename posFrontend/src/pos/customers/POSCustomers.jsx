import { useState, useMemo } from 'react';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';

const MOCK_CUSTOMERS = [
    { id: 1,  name: 'Alice Johnson',  phone: '+1 555-0101', points: 420, lastVisit: '2025-01-15', visits: 12 },
    { id: 2,  name: 'Bob Martinez',   phone: '+1 555-0102', points: 85,  lastVisit: '2025-01-14', visits: 3  },
    { id: 3,  name: 'Carol White',    phone: '+1 555-0103', points: 1240,lastVisit: '2025-01-16', visits: 38 },
    { id: 4,  name: 'David Kim',      phone: '+1 555-0104', points: 310, lastVisit: '2025-01-10', visits: 9  },
    { id: 5,  name: 'Emily Chen',     phone: '+1 555-0105', points: 75,  lastVisit: '2025-01-13', visits: 2  },
    { id: 6,  name: 'Frank Nguyen',   phone: '+1 555-0106', points: 590, lastVisit: '2025-01-12', visits: 17 },
    { id: 7,  name: 'Grace Patel',    phone: '+1 555-0107', points: 220, lastVisit: '2025-01-11', visits: 6  },
    { id: 8,  name: 'Henry Brooks',   phone: '+1 555-0108', points: 930, lastVisit: '2025-01-09', visits: 25 },
];

function avatarColor(name) {
    const colors = ['bg-purple-600','bg-blue-600','bg-emerald-600','bg-rose-600','bg-amber-600','bg-cyan-600','bg-indigo-600','bg-pink-600'];
    return colors[name.charCodeAt(0) % colors.length];
}

export default function POSCustomers() {
    const [query, setQuery] = useState('');
    const [selected, setSelected] = useState(null);

    const filtered = useMemo(() =>
        query.trim()
            ? MOCK_CUSTOMERS.filter(c =>
                c.name.toLowerCase().includes(query.toLowerCase()) ||
                c.phone.includes(query)
              )
            : MOCK_CUSTOMERS,
        [query]
    );

    return (
        <div className="flex flex-col h-full bg-[#0f0f0f] text-white overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5">
                <div className="flex items-center gap-3 mb-4">
                    <PeopleAltRoundedIcon sx={{ fontSize: 28 }} className="text-brand-primary" />
                    <h1 className="text-xl font-bold">Customers</h1>
                    <button
                        onClick={() => setSelected({ id: 'walk-in', name: 'Walk-in Customer', phone: '', points: 0, lastVisit: null, visits: 0 })}
                        className="ml-auto flex items-center gap-2 bg-brand-primary hover:bg-brand-hover text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
                    >
                        <PersonAddRoundedIcon sx={{ fontSize: 18 }} />
                        Add Walk-in
                    </button>
                </div>
                {/* Search */}
                <div className="relative">
                    <SearchRoundedIcon sx={{ fontSize: 20 }} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search by name or phone…"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="w-full h-12 pl-11 pr-4 bg-[#1a1a1a] border border-white/10 rounded-2xl text-white placeholder-gray-600 text-sm focus:outline-none focus:border-brand-primary/60 transition-colors"
                    />
                </div>
            </div>

            {/* Customer grid */}
            <div className="flex-1 overflow-y-auto p-6">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600">
                        <PeopleAltRoundedIcon sx={{ fontSize: 48 }} />
                        <p className="mt-3 text-sm">No customers found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filtered.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setSelected(c)}
                                className={`text-left bg-[#1a1a1a] border rounded-2xl p-4 hover:border-brand-primary/50 transition-all ${selected?.id === c.id ? 'border-brand-primary' : 'border-white/5'}`}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-full ${avatarColor(c.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                                        {c.name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-white font-semibold text-sm truncate">{c.name}</p>
                                        <p className="text-gray-500 text-xs">{c.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold">
                                        <StarRoundedIcon sx={{ fontSize: 14 }} />
                                        {c.points} pts
                                    </span>
                                    <span className="text-gray-600 text-[10px]">{c.visits} visits</span>
                                </div>
                                {c.lastVisit && (
                                    <p className="text-gray-600 text-[10px] mt-1">Last: {c.lastVisit}</p>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected customer bar */}
            {selected && (
                <div className="border-t border-white/5 bg-[#1a1a1a] px-6 py-4 flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${avatarColor(selected.name)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {selected.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">{selected.name}</p>
                        {selected.phone && <p className="text-gray-500 text-xs">{selected.phone}</p>}
                    </div>
                    <span className="flex items-center gap-1 text-amber-400 text-sm font-semibold">
                        <StarRoundedIcon sx={{ fontSize: 16 }} />
                        {selected.points} pts
                    </span>
                    <button
                        onClick={() => setSelected(null)}
                        className="text-xs text-gray-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10"
                    >
                        Clear
                    </button>
                </div>
            )}
        </div>
    );
}
