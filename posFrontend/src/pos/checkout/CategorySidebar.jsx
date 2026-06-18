import TableRestaurantRoundedIcon from '@mui/icons-material/TableRestaurantRounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';

const ORDER_TYPES = [
    { value: 'DINE_IN',   label: 'Dine In',  Icon: TableRestaurantRoundedIcon },
    { value: 'TAKEAWAY',  label: 'Takeaway',  Icon: ShoppingBagRoundedIcon },
    { value: 'DELIVERY',  label: 'Delivery',  Icon: TwoWheelerRoundedIcon },
];

const FAVORITES = [
    { id: 'fav-1', name: 'Chicken Wings' },
    { id: 'fav-2', name: 'Beef Burger' },
    { id: 'fav-3', name: 'Grilled Pasta' },
];

export default function CategorySidebar({ categories, selected, onSelect, orderType, onOrderTypeChange }) {
    return (
        <aside className="w-52 flex-shrink-0 bg-[#111111] flex flex-col h-full overflow-y-auto border-r border-white/5">
            {/* Order Type */}
            <div className="p-3 space-y-2 border-b border-white/5">
                <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest px-1 mb-3">
                    Order Type
                </p>
                {ORDER_TYPES.map((entry) => {
                    const OrderIcon = entry.Icon;
                    return (
                        <button
                            key={entry.value}
                            onClick={() => onOrderTypeChange(entry.value)}
                            className={`flex items-center gap-3 w-full h-14 px-4 rounded-xl transition-all duration-150 ${
                                orderType === entry.value
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                                    : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222] hover:text-white'
                            }`}
                        >
                            <OrderIcon sx={{ fontSize: 20 }} />
                            <span className="text-sm font-medium">{entry.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Categories */}
            <div className="flex-1 py-3">
                <p className="text-gray-500 text-[10px] font-semibold uppercase tracking-widest px-4 mb-2">
                    Categories
                </p>

                <button
                    onClick={() => onSelect('all')}
                    className={`flex items-center gap-3 w-full py-3 px-4 transition-all duration-150 ${
                        selected === 'all'
                            ? 'bg-white/10 text-white border-l-2 border-violet-500'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    }`}
                >
                    <GridViewRoundedIcon sx={{ fontSize: 18 }} />
                    <span className="text-sm font-medium">All Items</span>
                </button>

                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => onSelect(cat.name)}
                        className={`flex items-center gap-3 w-full py-3 px-4 transition-all duration-150 ${
                            selected === cat.name
                                ? 'bg-white/10 text-white border-l-2 border-violet-500'
                                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                        <RestaurantMenuRoundedIcon sx={{ fontSize: 18 }} />
                        <span className="text-sm font-medium truncate">{cat.name}</span>
                    </button>
                ))}
            </div>

            {/* Favorites */}
            <div className="py-3 border-t border-white/5">
                <p className="flex items-center gap-1.5 text-gray-500 text-[10px] font-semibold uppercase tracking-widest px-4 mb-2">
                    <StarRoundedIcon sx={{ fontSize: 14 }} className="text-amber-500" />
                    Favorites
                </p>
                {FAVORITES.map(fav => (
                    <button
                        key={fav.id}
                        className="flex items-center gap-3 w-full py-2.5 px-4 text-gray-500 hover:text-white hover:bg-white/5 transition-all duration-150"
                    >
                        <span className="text-xs truncate">{fav.name}</span>
                    </button>
                ))}
            </div>
        </aside>
    );
}
