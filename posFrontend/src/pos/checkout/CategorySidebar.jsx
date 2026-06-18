import GridViewRoundedIcon from '@mui/icons-material/GridViewRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import LocalPizzaRoundedIcon from '@mui/icons-material/LocalPizzaRounded';

export default function CategorySidebar({ categories, selected, onSelect }) {
    const allBtn = (
        <button
            key="all"
            onClick={() => onSelect('all')}
            className={`flex items-center gap-3 w-full min-h-[64px] px-5 rounded-2xl font-semibold text-base transition-all duration-150 ${
                selected === 'all'
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                    : 'bg-[#1c1c1c] text-gray-400 hover:bg-[#222] hover:text-white active:scale-95'
            }`}
        >
            <GridViewRoundedIcon sx={{ fontSize: 24 }} />
            <span>All Items</span>
        </button>
    );

    const favBtn = (
        <button
            key="favorites"
            onClick={() => onSelect('__favorites__')}
            className={`flex items-center gap-3 w-full min-h-[64px] px-5 rounded-2xl font-semibold text-base transition-all duration-150 ${
                selected === '__favorites__'
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                    : 'bg-[#1c1c1c] text-gray-400 hover:bg-[#222] hover:text-white active:scale-95'
            }`}
        >
            <StarRoundedIcon sx={{ fontSize: 24 }} />
            <span>Favorites</span>
        </button>
    );

    return (
        <aside className="w-[280px] flex-shrink-0 bg-[#0f0f0f] flex flex-col h-full overflow-y-auto border-r border-white/5">
            <div className="p-4 flex flex-col gap-2.5">
                {/* Section label */}
                <p className="text-gray-600 text-[11px] font-semibold uppercase tracking-widest px-1 mb-1">
                    Categories
                </p>

                {allBtn}
                {favBtn}

                {/* Divider */}
                {categories.length > 0 && (
                    <div className="border-t border-white/5 my-1" />
                )}

                {categories.map(cat => {
                    const isActive = selected === cat.name;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => onSelect(cat.name)}
                            className={`flex items-center gap-3 w-full min-h-[64px] px-5 rounded-2xl font-semibold text-base transition-all duration-150 ${
                                isActive
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/25'
                                    : 'bg-[#1c1c1c] text-gray-400 hover:bg-[#222] hover:text-white active:scale-95'
                            }`}
                        >
                            {cat.icon
                                ? <img src={cat.icon} alt="" className="w-6 h-6 object-contain" />
                                : <RestaurantMenuRoundedIcon sx={{ fontSize: 24 }} />
                            }
                            <span className="truncate">{cat.name}</span>
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
