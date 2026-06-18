import { useState, useMemo, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAllProducts, listCategories } from '../../services/api.js';
import CategorySidebar from './CategorySidebar.jsx';
import POSProductCard from './POSProductCard.jsx';
import OrderPanel from './OrderPanel.jsx';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

const PaymentModal = lazy(() => import('./PaymentModal.jsx'));

export default function POSCheckout() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [orderType, setOrderType]               = useState('DINE_IN');
    const [searchQuery, setSearchQuery]           = useState('');
    const [showPayment, setShowPayment]           = useState(false);

    const { data: products = [], isLoading: productsLoading } = useQuery({
        queryKey: ['products'],
        queryFn: () => getAllProducts().then(r => r.data),
        staleTime: 60_000,
    });

    const { data: categories = [] } = useQuery({
        queryKey: ['categories'],
        queryFn: () => listCategories().then(r => r.data),
    });

    const filtered = useMemo(() => {
        return products.filter(p => {
            if (!p.active) return false;
            if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
            if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [products, selectedCategory, searchQuery]);

    return (
        <div className="flex h-full bg-[#0a0a0a] overflow-hidden">
            {/* Left: Category sidebar */}
            <CategorySidebar
                categories={categories}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                orderType={orderType}
                onOrderTypeChange={setOrderType}
            />

            {/* Center: Product grid */}
            <div className="flex-1 flex flex-col overflow-hidden border-x border-white/5">
                {/* Search bar */}
                <div className="p-4 border-b border-white/5">
                    <div className="relative">
                        <SearchRoundedIcon
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
                            sx={{ fontSize: 20 }}
                        />
                        <input
                            type="text"
                            placeholder="Search menu..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full h-12 bg-[#1a1a1a] border border-white/10 rounded-xl pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 text-sm"
                        />
                    </div>
                </div>

                {/* Product grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {productsLoading ? (
                        <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                            {[...Array(12)].map((_, i) => (
                                <div key={i} className="aspect-[4/5] bg-[#1a1a1a] rounded-2xl animate-pulse" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <p className="text-lg">No items found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
                            {filtered.map(product => (
                                <POSProductCard key={product.id} product={product} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Order panel */}
            <OrderPanel
                orderType={orderType}
                onPaymentOpen={() => setShowPayment(true)}
            />

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
