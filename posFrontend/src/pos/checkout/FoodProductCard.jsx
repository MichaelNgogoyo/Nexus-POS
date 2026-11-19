import { useState } from 'react';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import { getProductImageUrl } from '../../services/api.js';
import { isMenuProductAvailable } from './menuUtils.js';

const money = (amount) => `KSh ${Number(amount || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;

export default function FoodProductCard({ product, count = 0, featured = false, onSelect }) {
  const [imageFailed, setImageFailed] = useState(false);
  const available = isMenuProductAvailable(product);
  const categoryName = typeof product.category === 'string' ? product.category : product.category?.name;

  return (
    <button
      type="button"
      className={`food-product-card ${featured ? 'food-product-card-featured' : ''} ${!available ? 'is-unavailable' : ''}`}
      onClick={() => available && onSelect(product)}
      disabled={!available}
      aria-label={`${available ? 'Add' : 'Unavailable'} ${product.name}, ${money(product.price)}`}
    >
      <span className="food-product-image">
        {!imageFailed && product.id != null && (
          <img
            src={getProductImageUrl(product.id)}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
        {imageFailed || product.id == null ? <span className="food-image-fallback"><RestaurantMenuRoundedIcon /></span> : null}
        {!available && <span className="food-unavailable-label">Unavailable</span>}
      </span>
      <span className="food-product-info">
        {categoryName && <span className="food-product-category">{categoryName}</span>}
        <span className="food-product-name">{product.name}</span>
        <span className="food-product-card-bottom">
          <span className="food-product-price">{money(product.price)}</span>
          {count > 0 && <span className="food-product-count-inline">{count} added</span>}
          {available && <span className="food-product-add-label" aria-hidden="true"><AddRoundedIcon /></span>}
        </span>
      </span>
    </button>
  );
}
