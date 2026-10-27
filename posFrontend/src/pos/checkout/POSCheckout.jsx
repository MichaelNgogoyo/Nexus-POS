import { useMemo, useState, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useKeycloak } from '@react-keycloak/web';
import {
  getAllProducts, getAllTables, getDashboardSummary, getModifierGroups,
  getTaxRate, listCategories, searchCustomers,
} from '../../services/api.js';
import { usePermissions } from '../../auth/permissions.js';
import { useCart } from '../../context/CartContext.jsx';
import FoodProductCard from './FoodProductCard.jsx';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import RestaurantMenuRoundedIcon from '@mui/icons-material/RestaurantMenuRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import TakeoutDiningRoundedIcon from '@mui/icons-material/TakeoutDiningRounded';
import LocalHotelRoundedIcon from '@mui/icons-material/LocalHotelRounded';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import {
  ALL_CATEGORIES, filterMenuProducts, getMenuCategories, popularMenuProducts,
} from './menuUtils.js';

const PaymentModal = lazy(() => import('./PaymentModal.jsx'));
const money = (amount) => `KSh ${Number(amount || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
const roundMoney = (amount) => Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;
const modifierPrice = (modifier) => Number(modifier.additionalPrice || 0);
const productCategory = (product) => typeof product?.category === 'string' ? product.category : product?.category?.name;

const ORDER_TYPES = [
  { id: 'DINE_IN', label: 'Dine in', Icon: RestaurantRoundedIcon },
  { id: 'TAKEAWAY', label: 'Takeaway', Icon: TakeoutDiningRoundedIcon },
  { id: 'ROOM_CHARGE', label: 'Room charge · unavailable', Icon: LocalHotelRoundedIcon, disabled: true },
];

export default function POSCheckout() {
  const { keycloak } = useKeycloak();
  const { can } = usePermissions();
  const { cart, addToCart, removeFromCart } = useCart();
  const [orderType, setOrderType] = useState('DINE_IN');
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [search, setSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [guestQuery, setGuestQuery] = useState('');
  const [guest, setGuest] = useState(null);
  const [orderNote, setOrderNote] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [itemNote, setItemNote] = useState('');
  const [showAll, setShowAll] = useState(false);

  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => getAllProducts().then(({ data }) => data), staleTime: 60_000 });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: () => listCategories().then(({ data }) => data), staleTime: 60_000 });
  const tablesQuery = useQuery({ queryKey: ['tables'], queryFn: () => getAllTables().then(({ data }) => data), staleTime: 30_000 });
  const taxQuery = useQuery({ queryKey: ['taxRate'], queryFn: () => getTaxRate().then(({ data }) => data), staleTime: 300_000 });
  const popularityEnabled = can('view_reports');
  const popularityQuery = useQuery({
    queryKey: ['pos-popular-products'],
    queryFn: () => getDashboardSummary().then(({ data }) => data),
    staleTime: 300_000,
    enabled: popularityEnabled,
  });
  const guestsQuery = useQuery({
    queryKey: ['guest-search', guestQuery],
    queryFn: () => searchCustomers(guestQuery.trim()).then(({ data }) => data),
    enabled: guestQuery.trim().length >= 2 && !guest,
  });
  const modifiersQuery = useQuery({
    queryKey: ['modifier-groups', pendingProduct?.id],
    queryFn: () => getModifierGroups(pendingProduct.id).then(({ data }) => data),
    enabled: Boolean(pendingProduct),
  });

  const products = useMemo(() => Array.isArray(productsQuery.data) ? productsQuery.data : [], [productsQuery.data]);
  const tables = Array.isArray(tablesQuery.data) ? tablesQuery.data : [];
  const categories = useMemo(() => getMenuCategories(categoriesQuery.data, products), [categoriesQuery.data, products]);
  const selectedCategory = categories.find((item) => item.id === category);
  const visibleProducts = useMemo(
    () => filterMenuProducts(products, { category, search }),
    [products, category, search],
  );
  const allAvailableProducts = useMemo(() => filterMenuProducts(products), [products]);
  const rankedProducts = useMemo(
    () => popularMenuProducts(allAvailableProducts, popularityQuery.data?.topProducts ?? []),
    [allAvailableProducts, popularityQuery.data?.topProducts],
  );
  const popularProducts = visibleProducts.filter((product) => rankedProducts.some((ranked) => String(ranked.id) === String(product.id)));
  const popularIds = new Set(popularProducts.map((product) => String(product.id)));
  const lunchCategory = categories.find((item) => item.id !== ALL_CATEGORIES && item.name.trim().toLocaleLowerCase() === 'lunch');
  const featuredCategory = category === ALL_CATEGORIES ? lunchCategory : selectedCategory;
  const featuredProducts = visibleProducts.filter((product) => {
    const matchesCategory = !featuredCategory || String(product.category?.id ?? `name:${productCategory(product)}`) === featuredCategory.id;
    return matchesCategory && !popularIds.has(String(product.id));
  });

  const taxRate = Number(taxQuery.data?.taxRate ?? 0);
  const serviceRate = Number(taxQuery.data?.serviceChargeRate ?? 0);
  const staffName = keycloak?.tokenParsed?.given_name || keycloak?.tokenParsed?.preferred_username || 'Cashier';
  const selectedTableRecord = tables.find((table) => String(table.id) === selectedTable);
  const availableTables = tables.filter((table) => table.status === 'AVAILABLE' || String(table.id) === selectedTable);
  const groups = modifiersQuery.data ?? [];
  const subtotal = roundMoney(cart.reduce((sum, item) => sum + roundMoney(roundMoney(Number(item.price) + (item.modifiers || []).reduce((acc, modifier) => acc + modifierPrice(modifier), 0)) * item.quantity), 0));
  const tax = roundMoney(subtotal * taxRate / 100);
  const service = roundMoney(subtotal * serviceRate / 100);
  const total = roundMoney(subtotal + tax + service);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const beginAdd = (product) => {
    setPendingProduct(product);
    setSelectedModifiers([]);
    setItemNote('');
  };

  const toggleModifier = (modifier, group) => {
    setSelectedModifiers((current) => {
      const exists = current.some((item) => item.id === modifier.id);
      if (exists) return current.filter((item) => item.id !== modifier.id);
      const groupSelection = current.filter((item) => item.groupId === group.id);
      const max = group.multiSelect ? Number(group.maxSelect ?? 99) : 1;
      if (groupSelection.length >= max) {
        return [...current.filter((item) => item.groupId !== group.id), modifier];
      }
      return [...current, { ...modifier, groupId: group.id }];
    });
  };

  const confirmAdd = () => {
    const missingRequired = groups.find((group) => {
      const count = selectedModifiers.filter((item) => item.groupId === group.id).length;
      const minimum = Number(group.minSelect ?? (group.required ? 1 : 0));
      return count < minimum;
    });
    if (missingRequired) return;
    addToCart(pendingProduct, { modifiers: selectedModifiers, notes: itemNote.trim() });
    setPendingProduct(null);
    setCartOpen(true);
  };

  return (
    <div className="foodpos-checkout">
      <div className="foodpos-scroll-area">
        <header className="foodpos-topbar">
          <div className="foodpos-search-box">
            <SearchRoundedIcon aria-hidden="true" />
            <input
              type="search"
              aria-label="Search dish name, ingredient, or SKU"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setShowAll(true); }}
              placeholder="Search dish name or ingredient"
            />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><CloseRoundedIcon /></button>}
          </div>
          <div className="foodpos-staff-badge"><span className="foodpos-staff-avatar">{staffName.slice(0, 1).toUpperCase()}</span><span>{staffName}</span></div>
        </header>

        <div className="foodpos-order-type" role="group" aria-label="Order type">
          {ORDER_TYPES.map((item) => {
            const IconComponent = item.Icon;
            return <button type="button" key={item.id} disabled={item.disabled} title={item.disabled ? 'Connect a hotel PMS before using room charges' : undefined} className={`${orderType === item.id ? 'selected' : ''}${item.disabled ? ' unavailable' : ''}`} aria-pressed={orderType === item.id} onClick={() => { if (item.disabled) return; setOrderType(item.id); setSelectedTable(''); }}>
              <IconComponent aria-hidden="true" /><span>{item.label}</span>
            </button>;
          })}
        </div>

        <nav className="foodpos-categories" aria-label="Menu categories">
          {categories.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={`${category === item.id ? 'selected' : ''} category-tone-${index % 6}`}
              aria-pressed={category === item.id}
              onClick={() => { setCategory(item.id); setShowAll(false); }}
            >
              {index === 0 ? <span className="category-icon category-icon-all"><RestaurantMenuRoundedIcon aria-hidden="true" /></span> : <span className="category-icon"><RestaurantMenuRoundedIcon aria-hidden="true" /></span>}
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <p className="foodpos-integration-note" role="status">Room charges are unavailable until the hotel system can validate stays and confirm folio postings.</p>

        {!showAll && <section className="foodpos-section">
          <header className="foodpos-section-heading">
            <div><h1>Popular</h1><p>Top-selling dishes from recorded sales.</p></div>
            {rankedProducts.length > 0 && <button type="button" className="foodpos-view-all" onClick={() => setShowAll(true)}>View all <ArrowForwardRoundedIcon /></button>}
          </header>
          {!popularityEnabled ? (
            <div className="foodpos-inline-empty">Best-seller ranking is restricted to manager reports. Browse the full menu below.</div>
          ) : popularityQuery.isLoading ? (
            <div className="foodpos-product-grid">{[0, 1, 2, 3].map((item) => <div className="foodpos-product-skeleton" key={item} />)}</div>
          ) : popularityQuery.isError ? (
            <div className="foodpos-inline-error" role="alert">Popular dishes could not be loaded. <button type="button" onClick={() => popularityQuery.refetch()}><RefreshRoundedIcon /> Retry</button></div>
          ) : popularProducts.length === 0 ? (
            <div className="foodpos-inline-empty">No best-selling dishes are available for this selection yet.</div>
          ) : (
            <div className="foodpos-product-grid">
              {popularProducts.slice(0, showAll ? 8 : 4).map((product) => (
                <FoodProductCard key={product.id} product={product} count={cart.filter((item) => String(item.id) === String(product.id)).reduce((sum, item) => sum + item.quantity, 0)} onSelect={beginAdd} />
              ))}
            </div>
          )}
        </section>}

        <section className="foodpos-section foodpos-featured-section">
          <header className="foodpos-section-heading">
            <div>
              <h2>{showAll ? (selectedCategory?.name || 'All dishes') : (featuredCategory?.name || (selectedCategory?.name !== 'All dishes' ? selectedCategory?.name : 'More dishes'))}</h2>
              <p>{search ? `${visibleProducts.length} matching dishes` : 'Made fresh for your guests'}</p>
            </div>
            {!showAll && <button type="button" className="foodpos-view-all" onClick={() => setShowAll(true)}>View all <ArrowForwardRoundedIcon /></button>}
          </header>

          {productsQuery.isLoading ? (
            <div className="foodpos-product-grid foodpos-featured-grid">{[0, 1, 2].map((item) => <div className="foodpos-featured-skeleton" key={item} />)}</div>
          ) : productsQuery.isError ? (
            <div className="foodpos-empty-state foodpos-error-state" role="alert"><RestaurantMenuRoundedIcon /><strong>Menu could not be loaded</strong><span>Check the connection and try again.</span><button type="button" onClick={() => productsQuery.refetch()}><RefreshRoundedIcon /> Try again</button></div>
          ) : showAll ? (
            visibleProducts.length ? <div className="foodpos-product-grid foodpos-featured-grid">{visibleProducts.map((product) => <FoodProductCard key={product.id} product={product} featured count={cart.filter((item) => String(item.id) === String(product.id)).reduce((sum, item) => sum + item.quantity, 0)} onSelect={beginAdd} />)}</div>
              : <div className="foodpos-empty-state"><ShoppingBagOutlinedIcon /><strong>{search ? 'No dishes match your search' : 'No dishes in this category'}</strong><span>Try another category or clear your search.</span></div>
          ) : featuredProducts.length ? (
            <div className="foodpos-product-grid foodpos-featured-grid">{featuredProducts.map((product) => <FoodProductCard key={product.id} product={product} featured count={cart.filter((item) => String(item.id) === String(product.id)).reduce((sum, item) => sum + item.quantity, 0)} onSelect={beginAdd} />)}</div>
          ) : (
            <div className="foodpos-empty-state"><ShoppingBagOutlinedIcon /><strong>{search ? 'No dishes match your search' : popularProducts.length ? 'All dishes in this section are listed above' : 'No dishes in this category yet'}</strong><span>Choose another category or view the full menu.</span></div>
          )}

          {categoriesQuery.isError && <p className="foodpos-data-note" role="status">Category service is unavailable; showing categories available with menu items.</p>}
        </section>
      </div>

      <div className="foodpos-cart-summary" aria-live="polite">
        <div className="foodpos-cart-summary-copy"><span>Current order</span><strong>{itemCount} {itemCount === 1 ? 'item' : 'items'} <i /> {money(total)}</strong></div>
        <button type="button" onClick={() => setCartOpen(true)}>
          {cart.length ? 'Review order' : 'Start order'} <ArrowForwardRoundedIcon />
        </button>
      </div>

      {cartOpen && <div className="foodpos-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
        <section className="foodpos-order-drawer" role="dialog" aria-modal="true" aria-labelledby="foodpos-cart-title">
          <header className="foodpos-drawer-heading">
            <div><p className="foodpos-overline">CURRENT ORDER</p><h2 id="foodpos-cart-title">{selectedTableRecord?.name || (orderType === 'TAKEAWAY' ? 'Takeaway' : 'New order')}</h2><span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span></div>
            <button type="button" className="foodpos-icon-button" onClick={() => setCartOpen(false)} aria-label="Close order"><CloseRoundedIcon /></button>
          </header>

          <div className="foodpos-drawer-scroll">
            {orderType === 'DINE_IN' && <section className="foodpos-context-section">
              <div className="foodpos-subheading"><div><h3>Choose a table</h3><p>{selectedTableRecord?.name || 'Available tables'}</p></div><span>{availableTables.length} open</span></div>
              {tablesQuery.isLoading ? <div className="foodpos-state">Loading tables…</div> : tablesQuery.isError ? <div className="foodpos-inline-error" role="alert">Tables unavailable. <button type="button" onClick={() => tablesQuery.refetch()}><RefreshRoundedIcon /> Retry</button></div> : availableTables.length === 0 ? <div className="foodpos-inline-empty">No available tables. Select takeaway to continue.</div> : <div className="foodpos-table-list">{availableTables.map((table) => <button type="button" key={table.id} className={String(table.id) === selectedTable ? 'selected' : ''} aria-pressed={String(table.id) === selectedTable} onClick={() => setSelectedTable(String(table.id))}><RestaurantRoundedIcon /><span>{table.name}</span><small>{table.capacity ? `${table.capacity} seats` : 'Available'}</small></button>)}</div>}
            </section>}

            <section className="foodpos-context-section foodpos-guest-section">
              <label className="foodpos-field">Guest <span>Optional for restaurant orders</span>
                <input value={guestQuery} onChange={(event) => { setGuestQuery(event.target.value); setGuest(null); }} placeholder="Search guest name or phone" />
              </label>
              {guest && <div className="foodpos-selected-guest"><span>{guest.name}</span><button type="button" onClick={() => setGuest(null)} aria-label="Remove selected guest"><CloseRoundedIcon /></button></div>}
              {!guest && guestQuery.trim().length >= 2 && <div className="foodpos-guest-results">{guestsQuery.isLoading ? <span>Searching guests…</span> : guestsQuery.isError ? <span role="alert">Guest search failed. Try again.</span> : guestsQuery.data?.length ? guestsQuery.data.slice(0, 5).map((person) => <button type="button" key={person.id} onClick={() => { setGuest(person); setGuestQuery(''); }}>{person.name}<small>{person.phone || ''}</small></button>) : <span>No matching guests</span>}</div>}
            </section>

            <div className="foodpos-cart-lines">
              {cart.length === 0 ? <div className="foodpos-cart-empty"><ShoppingBagOutlinedIcon /><strong>Your order is empty</strong><span>Close this panel and tap a dish to add it.</span></div> : cart.map((item) => {
                const unit = Number(item.price) + (item.modifiers || []).reduce((sum, modifier) => sum + modifierPrice(modifier), 0);
                const lineKey = item.cartLineKey || String(item.id);
                return <article className="foodpos-cart-line" key={lineKey}>
                  <div className="foodpos-cart-line-details"><strong>{item.name}</strong><small>{(item.modifiers || []).map((modifier) => modifier.name).join(', ') || money(item.price)}{item.notes ? ` · ${item.notes}` : ''}</small></div>
                  <div className="foodpos-quantity"><button type="button" onClick={() => removeFromCart(lineKey)} aria-label={`Remove one ${item.name}`}><RemoveRoundedIcon /></button><span>{item.quantity}</span><button type="button" onClick={() => addToCart(item, { modifiers: item.modifiers, notes: item.notes })} aria-label={`Add one ${item.name}`}><AddRoundedIcon /></button></div>
                  <strong className="foodpos-line-total">{money(unit * item.quantity)}</strong>
                </article>;
              })}
            </div>

            {cart.length > 0 && <label className="foodpos-field foodpos-kitchen-note">Kitchen note<textarea value={orderNote} onChange={(event) => setOrderNote(event.target.value)} maxLength={500} placeholder="Allergies or preparation notes" /></label>}
          </div>

          <footer className="foodpos-drawer-footer">
            <div className="foodpos-total-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            {taxQuery.isLoading ? <div className="foodpos-state">Loading tax and service rates…</div> : taxQuery.isError ? <div className="foodpos-inline-error" role="alert">Tax and service rates are unavailable; payment is disabled.</div> : <>
              <div className="foodpos-total-row"><span>Tax <small>{taxRate}%</small></span><strong>{money(tax)}</strong></div>
              <div className="foodpos-total-row"><span>Service <small>{serviceRate}%</small></span><strong>{money(service)}</strong></div>
            </>}
            <div className="foodpos-total-row foodpos-total-due"><span>Total due</span><strong>{money(total)}</strong></div>
            <button
              type="button"
              className="foodpos-primary-action"
              disabled={!cart.length || taxQuery.isLoading || taxQuery.isError || (orderType === 'DINE_IN' && !selectedTable)}
              onClick={() => {
                setCartOpen(false); setShowPayment(true);
              }}
            >
              Continue to payment<span>{money(total)} <ArrowForwardRoundedIcon /></span>
            </button>
          </footer>
        </section>
      </div>}

      {pendingProduct && <div className="foodpos-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingProduct(null); }}>
        <section className="foodpos-modifier-dialog" role="dialog" aria-modal="true" aria-labelledby="modifier-dialog-title">
          <header className="foodpos-drawer-heading"><div><p className="foodpos-overline">CUSTOMIZE DISH</p><h2 id="modifier-dialog-title">{pendingProduct.name}</h2></div><button type="button" className="foodpos-icon-button" onClick={() => setPendingProduct(null)} aria-label="Close options"><CloseRoundedIcon /></button></header>
          {modifiersQuery.isLoading ? <div className="foodpos-state">Loading options…</div> : modifiersQuery.isError ? <div className="foodpos-inline-error" role="alert">Options could not be loaded. <button type="button" onClick={() => modifiersQuery.refetch()}><RefreshRoundedIcon /> Retry</button></div> : <div className="foodpos-modifier-groups">{groups.length === 0 ? <p className="foodpos-inline-empty">No options are configured for this dish.</p> : groups.map((group) => <fieldset key={group.id}><legend>{group.name}{group.required && <span>Required</span>}</legend><p>{group.multiSelect ? `Choose up to ${group.maxSelect ?? 'any'} options` : 'Choose one option'}</p><div>{(group.modifiers || []).filter((modifier) => modifier.available !== false).map((modifier) => {
            const checked = selectedModifiers.some((item) => item.id === modifier.id);
            return <button type="button" key={modifier.id} className={checked ? 'selected' : ''} aria-pressed={checked} onClick={() => toggleModifier({ ...modifier, groupId: group.id }, group)}><span>{modifier.name}</span><strong>{modifierPrice(modifier) > 0 ? `+ ${money(modifierPrice(modifier))}` : 'Included'}</strong></button>;
          })}</div></fieldset>)}</div>}
          <label className="foodpos-field">Item note<input value={itemNote} maxLength={250} onChange={(event) => setItemNote(event.target.value)} placeholder="Optional preparation note" /></label>
          <footer className="foodpos-modifier-actions"><button type="button" className="foodpos-secondary-action" onClick={() => setPendingProduct(null)}>Cancel</button><button type="button" className="foodpos-primary-action" disabled={modifiersQuery.isLoading || modifiersQuery.isError} onClick={confirmAdd}>Add item <span>{money(Number(pendingProduct.price) + selectedModifiers.reduce((sum, modifier) => sum + modifierPrice(modifier), 0))}</span></button></footer>
        </section>
      </div>}

      {showPayment && <Suspense fallback={<div className="foodpos-dialog-backdrop"><div className="foodpos-loading-panel">Loading payment…</div></div>}><PaymentModal orderType={orderType} tableId={Number(selectedTable)} guestName={guest?.name} orderNotes={orderNote} onClose={() => setShowPayment(false)} /></Suspense>}
    </div>
  );
}
