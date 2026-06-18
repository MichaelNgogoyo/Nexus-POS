import { memo } from 'react';
import { useCart } from '../../context/CartContext.jsx';
import { getProductImageUrl } from '../../services/api.js';
import AddRoundedIcon from '@mui/icons-material/AddRounded';

const POSProductCard = memo(function POSProductCard({ product }) {
    const { addToCart, cart } = useCart();
    const cartItem = cart.find(i => i.id === product.id);
    const qty = cartItem?.quantity ?? 0;

    const lowStock = product.quantity > 0 && product.quantity <= (product.lowStockThreshold ?? 5);
    const outOfStock = product.quantity === 0;

    return (
        <button
            onClick={() => !outOfStock && addToCart(product)}
            disabled={outOfStock}
            className={`relative flex flex-col bg-[#161616] rounded-2xl overflow-hidden border transition-all duration-150 text-left group min-h-[220px] ${
                outOfStock
                    ? 'border-white/5 opacity-50 cursor-not-allowed'
                    : qty > 0
                    ? 'border-violet-500/60 shadow-lg shadow-violet-600/10'
                    : 'border-white/5 hover:border-violet-500/40 hover:bg-[#1c1c1c] active:scale-95'
            }`}
        >
            {/* Image */}
            <div className="relative w-full bg-[#111] overflow-hidden" style={{ height: '140px' }}>
                <img
                    src={getProductImageUrl(product.id)}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                    onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
                {/* Emoji fallback */}
                <div className="absolute inset-0 hidden items-center justify-center text-5xl bg-[#111]">
                    🍽️
                </div>

                {/* Cart qty badge */}
                {qty > 0 && (
                    <div className="absolute top-2.5 right-2.5 min-w-[28px] h-7 bg-violet-600 rounded-full text-white text-sm font-bold flex items-center justify-center px-2 shadow-lg">
                        {qty}
                    </div>
                )}

                {/* Low stock badge */}
                {lowStock && !outOfStock && (
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-amber-500/90 rounded-lg text-white text-[10px] font-bold uppercase tracking-wide">
                        Low Stock
                    </div>
                )}

                {/* Out of stock overlay */}
                {outOfStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="text-gray-300 text-sm font-semibold">Out of Stock</span>
                    </div>
                )}

                {/* Hover add button */}
                {!outOfStock && (
                    <div className="absolute inset-0 bg-violet-600/0 group-hover:bg-violet-600/15 transition-all flex items-end justify-end p-2 opacity-0 group-hover:opacity-100">
                        <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-xl">
                            <AddRoundedIcon className="text-white" sx={{ fontSize: 22 }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3 flex-1 flex flex-col justify-between">
                <p className="text-white font-semibold leading-snug line-clamp-2 text-[15px]">
                    {product.name}
                </p>
                <p className="text-violet-400 font-bold text-xl mt-1.5">
                    KSh {Number(product.price).toLocaleString()}
                </p>
            </div>
        </button>
    );
});

export default POSProductCard;
