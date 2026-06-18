import { useCart } from '../../context/CartContext.jsx';
import { getProductImageUrl } from '../../services/api.js';
import AddRoundedIcon from '@mui/icons-material/AddRounded';

export default function POSProductCard({ product }) {
    const { addToCart, cart } = useCart();
    const inCart = cart.find(i => i.id === product.id);

    return (
        <button
            onClick={() => addToCart(product)}
            className="relative flex flex-col bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 hover:border-violet-500/50 hover:bg-[#222] active:scale-95 transition-all duration-150 text-left group"
        >
            {/* Image */}
            <div className="relative w-full aspect-square bg-[#111]">
                <img
                    src={getProductImageUrl(product.id)}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={e => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
                {/* Fallback icon */}
                <div className="absolute inset-0 hidden items-center justify-center text-gray-600 text-3xl">
                    🍽️
                </div>

                {/* Cart quantity badge */}
                {inCart && (
                    <div className="absolute top-2 right-2 min-w-[24px] h-6 bg-violet-600 rounded-full text-white text-xs font-bold flex items-center justify-center px-1.5">
                        {inCart.quantity}
                    </div>
                )}

                {/* Hover add overlay */}
                <div className="absolute inset-0 bg-violet-600/0 group-hover:bg-violet-600/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="w-12 h-12 bg-violet-600 rounded-full flex items-center justify-center shadow-lg">
                        <AddRoundedIcon className="text-white" sx={{ fontSize: 24 }} />
                    </div>
                </div>
            </div>

            {/* Info */}
            <div className="p-2.5">
                <p className="text-white text-sm font-semibold leading-tight line-clamp-2">{product.name}</p>
                <p className="text-violet-400 font-bold text-base mt-1">
                    KSh {Number(product.price).toLocaleString()}
                </p>
            </div>
        </button>
    );
}
