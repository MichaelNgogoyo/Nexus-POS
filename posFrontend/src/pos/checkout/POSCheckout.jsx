import { useState, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useKeycloak } from '@react-keycloak/web';
import { getAllProducts, listCategories } from '../../services/api.js';
import CategorySidebar from './CategorySidebar.jsx';
import POSProductCard from './POSProductCard.jsx';
import OrderPanel from './OrderPanel.jsx';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import SortRoundedIcon from '@mui/icons-material/SortRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';

const PaymentModal = lazy(() => import('./PaymentModal.jsx'));

function useLiveClock() {
    const [time, setTime] = useState(() => new Date());
    useState(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    });
    return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function useDebounce(value, delay = 250) {
    const [debounced, setDebounced] = useState(value);
    const timer = useRef(null);
    const set = useCallback((v) => {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setDebounced(v), delay);
    }, [delay]);
    return [debounced, set];
}

const SORT_OPTIONS = [
    { value: 'name-asc',      label: 'Name A → Z' },
    { value: 'name-desc',     label: 'Name Z → A' },
    { value: 'price-asc',     label: 'Price: Low to High' },
    { value: 'price-desc',    label: 'Price: High to Low' },
    { value: 'modified-desc', label: 'Date Modified: Newest' },
    { value: 'modified-asc',  label: 'Date Modified: Oldest' },
    { value: 'id-desc',       label: 'Newest Added' },
    { value: 'id-asc',        label: 'Oldest Added' },
];

const ORDER_TYPES = [
    { value: 'DINE_IN',  label: 'Dine In' },
    { value: 'TAKEAWAY', label: 'Takeaway' },
    { value: 'DELIVERY', label: 'Delivery' },
];

function sortProducts(products, sortKey) {
    return [...products].sort((a, b) => {
        switch (sortKey) {
            case 'name-asc':      return a.name.localeCompare(b.name);
            case 'name-desc':     return b.name.localeCompare(a.name);
            case 'price-asc':     return (a.price ?? 0) - (b.price ?? 0);
            case 'price-desc':    return (b.price ?? 0) - (a.price ?? 0);
            case 'modified-desc': return new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0);
            case 'modified-asc':  return new Date(a.updatedAt ?? 0) - new Date(b.updatedAt ?? 0);
            case 'id-desc':       return (b.id ?? 0) - (a.id ?? 0);
            case 'id-asc':        return (a.id ?? 0) - (b.id ?? 0);
            default:              return 0;
        }
    });
}

export default function POSCheckout() {
    const { keycloak } = useKeycloak();
    const username = keycloak?.tokenParsed?.preferred_username ?? 'Cashier';

    const [selectedCategory, setSelectedCategory] = useState('all');
    const [orderType, setOrderType]               = useState('DINE_IN');
    const [searchInput, setSearchInput]           = useState('');
    const [sortKey, setSortKey]                   = useState('name-asc');
    const [showSortMenu, setShowSortMenu]         = useState(false);
    const [showPayment, setShowPayment]           = useState(false);
    const [debouncedSearch, setDebouncedSearch]   = useDebounce('', 250);

    const clock = useLiveClock();

    const handleSearchChange = (e) => {
        setSearchInput(e.target.value);
        setDebouncedSearch(e.target.value);
    };

    const { data: products = [], isLoading } = useQuery({
        queryKey: ['products'],
        queryFn: () => getAllProducts().then(r => r.data),
        staleTime: 60_000,
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => listCategories().then(r => r.data),
    });

    const filtered = useMemo(() => {
        const base = products.filter(p => {
            if (!p.active) return false;
            if (selectedCategory !== 'all' && p.category?.name !== selectedCategory) return false;
            if (debouncedSearch && !p.name.toLowerCase().includes(debouncedSearch.toLowerCase())
                && !(p.sku ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())
                && !(p.barcode ?? '').includes(debouncedSearch)) return false;
            return true;
        });
        return sortProducts(base, sortKey);
    }, [products, selectedCategory, debouncedSearch, sortKey]);

    const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortKey)?.label ?? 'Sort';

    return (
        <div className="flex flex-col h-full bg-[#0a0a0a] overflow-hidden">

            {/* ══ HEADER BAR ══ */}
            <header className="h-20 flex-shrink-0 bg-[#0f0f0f] border-b border-white/5 flex items-center px-6 gap-4 z-20">
                {/* Brand */}
                <div className="flex items-center gap-2 mr-2">
                    <StorefrontRoundedIcon sx={{ fontSize: 26 }} className="text-violet-400" />
                    <span className="text-white font-bold text-lg tracking-tight hidden xl:block">POS</span>
                </div>

                {/* Search — large and prominent */}
                <div className="relative flex-1 max-w-2xl">
                    <SearchRoundedIcon
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                        sx={{ fontSize: 22 }}
                    />
                    <input
                        type="text"
                        placeholder="Search by name, barcode, or SKU..."
                        value={searchInput}
                        onChange={handleSearchChange}
                        className="w-full h-12 bg-[#1c1c1c] border border-white/10 rounded-2xl pl-12 pr-4 text-white text-base placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:bg-[#1f1f1f] transition-all"
                    />
                </div>

                {/* Order Type Tabs */}
                <div className="flex items-center bg-[#1a1a1a] rounded-2xl p-1 gap-1 flex-shrink-0">
                    {ORDER_TYPES.map(ot => (
                        <button
                            key={ot.value}
                            onClick={() => setOrderType(ot.value)}
                            className={`px-4 h-10 rounded-xl text-sm font-semibold transition-all duration-150 ${
                                orderType === ot.value
                                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            {ot.label}
                        </button>
                    ))}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Clock & User */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2 text-gray-400">
                        <AccessTimeRoundedIcon sx={{ fontSize: 18 }} />
                        <span className="text-sm font-mono font-medium">{clock}</span>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                        <span className="text-violet-400 text-sm font-bold uppercase">
                            {username.charAt(0)}
                        </span>
                    </div>
                </div>
            </header>

            {/* ══ BODY ══ */}
            <div className="flex flex-1 overflow-hidden">

                {/* Left: Category sidebar — fixed, scrollable internally */}
                <CategorySidebar
                    categories={categories}
                    selected={selectedCategory}
                    onSelect={setSelectedCategory}
                    orderType={orderType}
                    onOrderTypeChange={setOrderType}
                />

                {/* Center: Products area */}
                <div className="flex-1 flex flex-col overflow-hidden border-x border-white/5">

                    {/* Sort / Filter bar */}
                    <div className="h-14 flex-shrink-0 flex items-center justify-between px-4 border-b border-white/5 bg-[#0d0d0d]">
                        <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-sm">
                                {isLoading ? '…' : `${filtered.length} items`}
                            </span>
                        </div>

                        {/* Sort dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowSortMenu(v => !v)}
                                className="flex items-center gap-2 h-9 px-4 bg-[#1c1c1c] border border-white/10 rounded-xl text-gray-300 text-sm font-medium hover:border-violet-500/50 transition-all"
                            >
                                <SortRoundedIcon sx={{ fontSize: 18 }} />
                                <span className="hidden sm:block">{currentSortLabel}</span>
                            </button>
                            {showSortMenu && (
                                <>
                                    <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)} />
                                    <div className="absolute right-0 top-11 z-20 bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl py-1.5 min-w-[220px]">
                                        {SORT_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => { setSortKey(opt.value); setShowSortMenu(false); }}
                                                className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
                                                    sortKey === opt.value
                                                        ? 'text-violet-400 bg-violet-600/10'
                                                        : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                                }`}
                                            >
                                                {sortKey === opt.value && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 mr-2 flex-shrink-0" />
                                                )}
                                                {sortKey !== opt.value && <span className="w-1.5 mr-2" />}
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Product grid — ONLY this scrolls */}
                    <div className="flex-1 overflow-y-auto p-4">
                        {isLoading ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                {[...Array(16)].map((_, i) => (
                                    <div key={i} className="min-h-[220px] bg-[#1a1a1a] rounded-2xl animate-pulse" />
                                ))}
                            </div>
                        ) : filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3">
                                <span className="text-5xl">🍽️</span>
                                <p className="text-lg font-medium text-gray-500">No items found</p>
                                {debouncedSearch && (
                                    <p className="text-sm text-gray-600">Try a different search term</p>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                {filtered.map(product => (
                                    <POSProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Order panel — fixed, never scrolls away */}
                <OrderPanel
                    orderType={orderType}
                    onPaymentOpen={() => setShowPayment(true)}
                />
            </div>

            {/* Payment modal */}
            {showPayment && (
                <Suspense fallback={null}>
                    <PaymentModal
                        orderType={orderType}
                        onClose={() => setShowPayment(false)}
                    />
                </Suspense>
            )}
        </div>
    );
}
