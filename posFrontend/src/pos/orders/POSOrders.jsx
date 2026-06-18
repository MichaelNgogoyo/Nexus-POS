import { useMemo } from 'react';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import DineInRoundedIcon from '@mui/icons-material/RestaurantRounded';
import DeliveryRoundedIcon from '@mui/icons-material/DeliveryDiningRounded';
import TakeawayRoundedIcon from '@mui/icons-material/ShoppingBagRounded';

const ORDER_STATUS = {
    OPEN:      { label: 'Open',      bg: 'bg-blue-900/40',   border: 'border-blue-700/50',   text: 'text-blue-400',   dot: 'bg-blue-500'   },
    KITCHEN:   { label: 'Kitchen',   bg: 'bg-orange-900/40', border: 'border-orange-700/50', text: 'text-orange-400', dot: 'bg-orange-500' },
    READY:     { label: 'Ready',     bg: 'bg-emerald-900/40',border: 'border-emerald-700/50',text: 'text-emerald-400',dot: 'bg-emerald-500'},
    COMPLETED: { label: 'Completed', bg: 'bg-gray-900/40',   border: 'border-gray-700/50',   text: 'text-gray-400',   dot: 'bg-gray-500'   },
};

const TYPE_ICON = {
    'Dine In':  DineInRoundedIcon,
    'Takeaway': TakeawayRoundedIcon,
    'Delivery': DeliveryRoundedIcon,
};

const MOCK_ORDERS = [
    { id: '#1042', table: 'T-02', type: 'Dine In',  status: 'OPEN',      items: ['Margherita Pizza x2', 'Coke x2'],           time: '8 min ago', total: 42.50 },
    { id: '#1043', table: 'T-07', type: 'Dine In',  status: 'KITCHEN',   items: ['Pasta Carbonara x1', 'Tiramisu x1'],         time: '12 min ago',total: 28.00 },
    { id: '#1044', table: null,   type: 'Takeaway', status: 'KITCHEN',   items: ['Burger x2', 'Fries x2', 'Milkshake x1'],    time: '5 min ago', total: 37.80 },
    { id: '#1045', table: null,   type: 'Delivery', status: 'READY',     items: ['BBQ Ribs x1', 'Coleslaw x1', 'Bread x2'],   time: '22 min ago',total: 55.00 },
    { id: '#1046', table: 'T-03', type: 'Dine In',  status: 'OPEN',      items: ['Caesar Salad x2', 'Lemonade x2'],            time: '3 min ago', total: 24.00 },
    { id: '#1047', table: 'T-10', type: 'Dine In',  status: 'COMPLETED', items: ['Seafood Pasta x2', 'White Wine x1'],        time: '35 min ago',total: 68.50 },
    { id: '#1048', table: null,   type: 'Delivery', status: 'KITCHEN',   items: ['Chicken Wings x3', 'Dipping Sauce x2'],     time: '9 min ago', total: 31.20 },
    { id: '#1049', table: 'T-05', type: 'Dine In',  status: 'READY',     items: ['Steak x1', 'Mashed Potatoes x1', 'Wine x1'],time: '18 min ago',total: 89.00 },
];

export default function POSOrders() {
    const grouped = useMemo(() => {
        const map = { OPEN: [], KITCHEN: [], READY: [], COMPLETED: [] };
        MOCK_ORDERS.forEach(o => map[o.status].push(o));
        return map;
    }, []);

    return (
        <div className="flex flex-col h-full bg-[#0f0f0f] text-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
                <ReceiptLongRoundedIcon sx={{ fontSize: 28 }} className="text-brand-primary" />
                <h1 className="text-xl font-bold">Active Orders</h1>
                <span className="ml-auto text-sm text-gray-500">{MOCK_ORDERS.filter(o => o.status !== 'COMPLETED').length} active</span>
            </div>

            {/* Board */}
            <div className="flex gap-4 flex-1 overflow-x-auto p-6">
                {Object.entries(ORDER_STATUS).map(([statusKey, style]) => (
                    <div key={statusKey} className="flex flex-col min-w-[280px] w-[280px]">
                        {/* Column header */}
                        <div className="flex items-center gap-2 mb-3">
                            <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
                            <h2 className="text-sm font-semibold text-gray-300">{style.label}</h2>
                            <span className="ml-auto text-xs text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
                                {grouped[statusKey].length}
                            </span>
                        </div>

                        {/* Cards */}
                        <div className="flex flex-col gap-3 overflow-y-auto">
                            {grouped[statusKey].map(order => {
                                const TypeIcon = TYPE_ICON[order.type] ?? DineInRoundedIcon;
                                return (
                                    <div key={order.id} className={`rounded-2xl p-4 border ${style.bg} ${style.border}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-white font-bold">{order.id}</span>
                                            <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-black/30 ${style.text}`}>
                                                <TypeIcon sx={{ fontSize: 12 }} />
                                                {order.type}
                                            </span>
                                        </div>
                                        {order.table && (
                                            <p className="text-gray-400 text-xs mb-2">Table {order.table}</p>
                                        )}
                                        <ul className="space-y-0.5 mb-3">
                                            {order.items.map((item, i) => (
                                                <li key={i} className="text-gray-300 text-xs">• {item}</li>
                                            ))}
                                        </ul>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500 text-[10px]">{order.time}</span>
                                            <span className="text-white font-bold text-sm">${order.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
