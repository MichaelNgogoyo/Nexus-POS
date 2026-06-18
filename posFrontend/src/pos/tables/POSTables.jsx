import { useState, useMemo } from 'react';
import TableRestaurantRoundedIcon from '@mui/icons-material/TableRestaurantRounded';
import ChairRoundedIcon from '@mui/icons-material/ChairRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

const STATUS = {
    AVAILABLE: 'AVAILABLE',
    OCCUPIED:  'OCCUPIED',
    RESERVED:  'RESERVED',
    CLEANING:  'CLEANING',
};

const STATUS_STYLES = {
    AVAILABLE: { card: 'bg-emerald-900/30 border border-emerald-700/50', dot: 'bg-emerald-500', label: 'Available', text: 'text-emerald-400' },
    OCCUPIED:  { card: 'bg-red-900/30 border border-red-700/50',         dot: 'bg-red-500',     label: 'Occupied',  text: 'text-red-400'     },
    RESERVED:  { card: 'bg-amber-900/30 border border-amber-700/50',     dot: 'bg-amber-500',   label: 'Reserved',  text: 'text-amber-400'   },
    CLEANING:  { card: 'bg-blue-900/30 border border-blue-700/50',       dot: 'bg-blue-500',    label: 'Cleaning',  text: 'text-blue-400'    },
};

const FLOORS = ['Main Floor', 'Terrace', 'Bar'];

const MOCK_TABLES = [
    { id: 1, name: 'T-01', capacity: 2, status: STATUS.AVAILABLE, floor: 'Main Floor', since: null },
    { id: 2, name: 'T-02', capacity: 4, status: STATUS.OCCUPIED,  floor: 'Main Floor', since: '18:32' },
    { id: 3, name: 'T-03', capacity: 4, status: STATUS.OCCUPIED,  floor: 'Main Floor', since: '19:05' },
    { id: 4, name: 'T-04', capacity: 6, status: STATUS.RESERVED,  floor: 'Main Floor', since: null },
    { id: 5, name: 'T-05', capacity: 2, status: STATUS.AVAILABLE, floor: 'Main Floor', since: null },
    { id: 6, name: 'T-06', capacity: 4, status: STATUS.CLEANING,  floor: 'Main Floor', since: null },
    { id: 7, name: 'T-07', capacity: 8, status: STATUS.OCCUPIED,  floor: 'Main Floor', since: '17:50' },
    { id: 8, name: 'T-08', capacity: 4, status: STATUS.AVAILABLE, floor: 'Main Floor', since: null },
    { id: 9, name: 'TR-01',capacity: 4, status: STATUS.AVAILABLE, floor: 'Terrace',    since: null },
    { id: 10,name: 'TR-02',capacity: 6, status: STATUS.OCCUPIED,  floor: 'Terrace',    since: '19:15' },
    { id: 11,name: 'TR-03',capacity: 4, status: STATUS.RESERVED,  floor: 'Terrace',    since: null },
    { id: 12,name: 'TR-04',capacity: 2, status: STATUS.AVAILABLE, floor: 'Terrace',    since: null },
    { id: 13,name: 'B-01', capacity: 2, status: STATUS.OCCUPIED,  floor: 'Bar',        since: '20:10' },
    { id: 14,name: 'B-02', capacity: 2, status: STATUS.AVAILABLE, floor: 'Bar',        since: null },
    { id: 15,name: 'B-03', capacity: 2, status: STATUS.OCCUPIED,  floor: 'Bar',        since: '19:45' },
    { id: 16,name: 'B-04', capacity: 4, status: STATUS.CLEANING,  floor: 'Bar',        since: null },
];

const NEXT_STATUS = {
    AVAILABLE: STATUS.OCCUPIED,
    OCCUPIED:  STATUS.CLEANING,
    CLEANING:  STATUS.AVAILABLE,
    RESERVED:  STATUS.OCCUPIED,
};

export default function POSTables() {
    const [floor, setFloor] = useState('Main Floor');
    const [tables, setTables] = useState(MOCK_TABLES);
    const [selected, setSelected] = useState(null);

    const visible = useMemo(() => tables.filter(t => t.floor === floor), [tables, floor]);

    const counts = useMemo(() => ({
        total:     tables.length,
        available: tables.filter(t => t.status === STATUS.AVAILABLE).length,
        occupied:  tables.filter(t => t.status === STATUS.OCCUPIED).length,
        reserved:  tables.filter(t => t.status === STATUS.RESERVED).length,
    }), [tables]);

    const changeStatus = (id, newStatus) => {
        setTables(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, since: newStatus === STATUS.OCCUPIED ? new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null } : t));
        setSelected(null);
    };

    return (
        <div className="flex flex-col h-full bg-[#0f0f0f] text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <TableRestaurantRoundedIcon sx={{ fontSize: 28 }} className="text-brand-primary" />
                    <h1 className="text-xl font-bold">Floor Management</h1>
                </div>
                {/* Stats */}
                <div className="flex gap-6">
                    {[
                        { label: 'Total',     value: counts.total,     color: 'text-gray-300' },
                        { label: 'Available', value: counts.available, color: 'text-emerald-400' },
                        { label: 'Occupied',  value: counts.occupied,  color: 'text-red-400' },
                        { label: 'Reserved',  value: counts.reserved,  color: 'text-amber-400' },
                    ].map(s => (
                        <div key={s.label} className="text-center">
                            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest">{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Floor tabs */}
            <div className="flex gap-2 px-6 py-3 border-b border-white/5">
                {FLOORS.map(f => (
                    <button
                        key={f}
                        onClick={() => setFloor(f)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${floor === f ? 'bg-brand-primary text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Table grid */}
            <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {visible.map(table => {
                        const s = STATUS_STYLES[table.status];
                        return (
                            <button
                                key={table.id}
                                onClick={() => setSelected(table)}
                                className={`min-h-[120px] rounded-2xl p-4 flex flex-col justify-between text-left transition-all hover:scale-[1.02] ${s.card}`}
                            >
                                <div className="flex items-start justify-between">
                                    <span className="text-white font-bold text-lg">{table.name}</span>
                                    <span className={`w-2.5 h-2.5 rounded-full mt-1.5 ${s.dot}`} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1 text-gray-400 text-xs mb-1">
                                        <ChairRoundedIcon sx={{ fontSize: 14 }} />
                                        <span>{table.capacity} seats</span>
                                    </div>
                                    <span className={`text-xs font-semibold ${s.text}`}>{s.label}</span>
                                    {table.since && <p className="text-gray-500 text-[10px] mt-0.5">Since {table.since}</p>}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Modal */}
            {selected && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
                    <div className="bg-[#1a1a1a] rounded-3xl p-6 w-full max-w-sm border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-white font-bold text-lg">{selected.name}</h2>
                            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white">
                                <CloseRoundedIcon />
                            </button>
                        </div>
                        <p className="text-gray-400 text-sm mb-6">Capacity: {selected.capacity} · Status: <span className={STATUS_STYLES[selected.status].text}>{STATUS_STYLES[selected.status].label}</span></p>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.values(STATUS).map(st => (
                                <button
                                    key={st}
                                    onClick={() => changeStatus(selected.id, st)}
                                    className={`py-3 rounded-2xl text-sm font-semibold transition-all ${selected.status === st ? `${STATUS_STYLES[st].dot} bg-opacity-20 text-white` : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
                                >
                                    {STATUS_STYLES[st].label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => changeStatus(selected.id, NEXT_STATUS[selected.status])}
                            className="mt-4 w-full py-3 rounded-2xl bg-brand-primary text-white font-semibold text-sm hover:bg-brand-hover transition-all"
                        >
                            Mark as {STATUS_STYLES[NEXT_STATUS[selected.status]].label}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
