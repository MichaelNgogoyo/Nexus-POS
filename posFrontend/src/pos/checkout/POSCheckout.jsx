import { useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import {
  getAllProducts, getAllTables, getCurrentShift, getDashboardSummary, getModifierGroups,
  getTaxRate, listCategories, searchCustomers,
  submitOrderToKitchen, getCategoryImageUrl, getProductImageUrl,
} from '../../services/api.js';
import { usePermissions } from '../../auth/permissions.js';
import { useCart } from '../../context/CartContext.jsx';
import { getCartLineKey } from '../../context/cartUtils.js';
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
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import TableRestaurantRoundedIcon from '@mui/icons-material/TableRestaurantRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import LocalDiningRoundedIcon from '@mui/icons-material/LocalDiningRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import { ROUTES } from '../../routes.js';
import {
  ALL_CATEGORIES, categoryKey, filterMenuProducts, getMenuCategories, popularMenuProducts,
} from './menuUtils.js';
import { getCurrentThemeState, subscribeToThemeChanges, toggleThemeMode } from '../../theme/theme.js';

const PaymentModal = lazy(() => import('./PaymentModal.jsx'));
const money = (amount) => `KSh ${Number(amount || 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`;
const roundMoney = (amount) => Math.round((Number(amount || 0) + Number.EPSILON) * 100) / 100;
const modifierPrice = (modifier) => Number(modifier.additionalPrice || 0);

const ORDER_TYPES = [
  { id: 'DINE_IN', label: 'Dine in', Icon: RestaurantRoundedIcon },
  { id: 'TAKEAWAY', label: 'Takeaway', Icon: TakeoutDiningRoundedIcon },
  { id: 'ROOM_CHARGE', label: 'Room charge · unavailable', Icon: LocalHotelRoundedIcon, disabled: true },
];

function CategoryVisual({ category, product }) {
  const categorySource = category.imageUrl ? getCategoryImageUrl(category.id) : null;
  const productSource = product ? getProductImageUrl(product.id) : null;
  const [source, setSource] = useState(() => categorySource || productSource);
  useEffect(() => setSource(categorySource || productSource), [categorySource, productSource]);
  const onError = () => setSource((current) => current === categorySource && productSource ? productSource : null);
  return source
    ? <img className="foodpos-category-image" src={source} alt="" aria-hidden="true" loading="lazy" onError={onError} />
    : <RestaurantMenuRoundedIcon aria-hidden="true" />;
}

export default function POSCheckout() {
  const { keycloak } = useKeycloak();
  const { can } = usePermissions();
  const { cart, addToCart, removeFromCart, clearCart, setCart } = useCart();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [themeState, setThemeState] = useState(() => getCurrentThemeState());
  const cashierId = keycloak?.tokenParsed?.sub || keycloak?.subject;
  const [isDesktopOrderPanel, setIsDesktopOrderPanel] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches,
  );
  const [orderType, setOrderType] = useState('DINE_IN');
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [search, setSearch] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [guestQuery, setGuestQuery] = useState('');
  const [guest, setGuest] = useState(null);
  const [orderNote, setOrderNote] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCartLineKey, setActiveCartLineKey] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [itemNote, setItemNote] = useState('');
  const [addedAnnouncement, setAddedAnnouncement] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState(null);
  const [tableSelectionWarning, setTableSelectionWarning] = useState('');
  const requestedTableRef = useRef(searchParams.get('tableId'));
  const submitKeyRef = useRef({ signature: null, key: null });

  useEffect(() => subscribeToThemeChanges((event) => setThemeState(event.detail)), []);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 1024px)');
    const updateLayout = (event) => setIsDesktopOrderPanel(event.matches);
    setIsDesktopOrderPanel(media.matches);
    media.addEventListener('change', updateLayout);
    return () => media.removeEventListener('change', updateLayout);
  }, []);

  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => getAllProducts().then(({ data }) => data), staleTime: 60_000 });
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: () => listCategories().then(({ data }) => data), staleTime: 60_000 });
  const tablesQuery = useQuery({ queryKey: ['tables'], queryFn: () => getAllTables().then(({ data }) => data), staleTime: 30_000 });
  const shiftQuery = useQuery({
    queryKey: ['current-shift', cashierId],
    queryFn: async () => {
      try { return (await getCurrentShift(cashierId)).data; }
      catch (error) { if (error?.response?.status === 404) return null; throw error; }
    },
  });
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
  const cartModifierQueries = useQueries({ queries: cart.map((item) => ({
    queryKey: ['modifier-groups', Number(item.id)],
    queryFn: () => getModifierGroups(item.id).then(({ data }) => data),
    staleTime: 300_000,
  })) });
  const submitOrderMutation = useMutation({
    mutationFn: (payload) => submitOrderToKitchen(payload).then(({ data }) => data),
    onSuccess: (order) => {
      clearCart();
      setCartOpen(false);
      setSelectedTable('');
      setTableSelectionWarning('');
      setGuest(null);
      setGuestQuery('');
      setOrderNote('');
      setSubmittedOrder(order);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('tableId');
      setSearchParams(nextParams, { replace: true });
      submitKeyRef.current = { signature: null, key: null };
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['kitchen-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const products = useMemo(() => Array.isArray(productsQuery.data) ? productsQuery.data : [], [productsQuery.data]);
  const tables = useMemo(() => Array.isArray(tablesQuery.data) ? tablesQuery.data : [], [tablesQuery.data]);
  useEffect(() => {
    const requestedId = requestedTableRef.current;
    if (!requestedId || !tablesQuery.data) return;
    requestedTableRef.current = null;
    const requestedTable = tables.find((table) => String(table.id) === requestedId);
    if (requestedTable?.status === 'AVAILABLE') {
      setSelectedTable(requestedId);
    } else {
      setTableSelectionWarning(requestedTable
        ? 'That table is no longer available. Choose another table.'
        : 'The selected table could not be found. Choose an available table.');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('tableId');
      setSearchParams(nextParams, { replace: true });
    }
  }, [tables, tablesQuery.data, searchParams, setSearchParams]);
  useEffect(() => {
    if (!selectedTable || !tablesQuery.data) return;
    const selected = tables.find((table) => String(table.id) === selectedTable);
    if (selected?.status !== 'AVAILABLE') {
      setSelectedTable('');
      setTableSelectionWarning('That table is no longer available. Choose another table.');
    }
  }, [selectedTable, tables, tablesQuery.data]);
  const categories = useMemo(() => getMenuCategories(categoriesQuery.data, products), [categoriesQuery.data, products]);
  const categoryProducts = useMemo(() => {
    const byCategory = new Map();
    products.forEach((product) => {
      const key = categoryKey(product.category);
      if (key && !byCategory.has(key)) byCategory.set(key, product);
    });
    return byCategory;
  }, [products]);
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
  const orderedMenuProducts = useMemo(() => {
    if (!popularityEnabled || !rankedProducts.length) return visibleProducts;
    const rankedIds = new Set(rankedProducts.map((product) => String(product.id)));
    return [...visibleProducts].sort((left, right) => Number(rankedIds.has(String(right.id))) - Number(rankedIds.has(String(left.id))));
  }, [visibleProducts, popularityEnabled, rankedProducts]);

  const taxRate = Number(taxQuery.data?.taxRate ?? 0);
  const serviceRate = Number(taxQuery.data?.serviceChargeRate ?? 0);
  const staffName = keycloak?.tokenParsed?.given_name || keycloak?.tokenParsed?.preferred_username || 'Cashier';
  const selectedTableRecord = tables.find((table) => String(table.id) === selectedTable);
  const validDineInTable = orderType !== 'DINE_IN' || selectedTableRecord?.status === 'AVAILABLE';
  const availableTables = tables.filter((table) => table.status === 'AVAILABLE');
  const activeCartIndex = cart.findIndex((item) => (item.cartLineKey || String(item.id)) === activeCartLineKey);
  const activeModifierQuery = activeCartIndex >= 0 ? cartModifierQueries[activeCartIndex] : null;
  const groups = activeModifierQuery?.data ?? [];
  const subtotal = roundMoney(cart.reduce((sum, item) => sum + roundMoney(roundMoney(Number(item.price) + (item.modifiers || []).reduce((acc, modifier) => acc + modifierPrice(modifier), 0)) * item.quantity), 0));
  const tax = roundMoney(subtotal * taxRate / 100);
  const service = roundMoney(subtotal * serviceRate / 100);
  const total = roundMoney(subtotal + tax + service);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartOptionsReady = cartModifierQueries.length === cart.length && cartModifierQueries.every((query, index) => {
    if (query.isLoading || query.isError || !query.data) return false;
    return !query.data.some((group) => {
      const selectedCount = (cart[index].modifiers || []).filter((modifier) => String(modifier.groupId) === String(group.id)).length;
      const minimum = Number(group.minSelect ?? (group.required ? 1 : 0));
      return selectedCount < minimum;
    });
  });

  const beginAdd = (product) => {
    const lineKey = getCartLineKey(product.id, [], '');
    addToCart(product);
    setActiveCartLineKey(lineKey);
    setSelectedModifiers([]);
    setItemNote('');
    setAddedAnnouncement(`${product.name} added to order`);
    if (!isDesktopOrderPanel) setCartOpen(true);
  };

  const editCartLine = (item) => {
    const lineKey = item.cartLineKey || String(item.id);
    if (activeCartLineKey === lineKey) {
      setActiveCartLineKey(null);
      return;
    }
    setActiveCartLineKey(lineKey);
    setSelectedModifiers(item.modifiers || []);
    setItemNote(item.notes || '');
  };

  const toggleModifier = (modifier, group) => {
    setSelectedModifiers((current) => {
      const exists = current.some((item) => String(item.id) === String(modifier.id));
      if (exists) return current.filter((item) => String(item.id) !== String(modifier.id));
      const groupSelection = current.filter((item) => String(item.groupId) === String(group.id));
      const max = group.multiSelect ? Number(group.maxSelect ?? 99) : 1;
      if (groupSelection.length >= max) {
        return [...current.filter((item) => String(item.groupId) !== String(group.id)), { ...modifier, groupId: group.id }];
      }
      return [...current, { ...modifier, groupId: group.id }];
    });
  };

  const saveCartLineOptions = () => {
    const missingRequired = groups.find((group) => {
      const count = selectedModifiers.filter((item) => String(item.groupId) === String(group.id)).length;
      const minimum = Number(group.minSelect ?? (group.required ? 1 : 0));
      return count < minimum;
    });
    if (missingRequired) return;
    const currentItem = cart[activeCartIndex];
    if (!currentItem) return;
    const newLineKey = getCartLineKey(currentItem.id, selectedModifiers, itemNote.trim());
    setCart((current) => {
      const target = current.find((line) => (line.cartLineKey || String(line.id)) === activeCartLineKey);
      if (!target) return current;
      const updated = { ...target, modifiers: selectedModifiers, notes: itemNote.trim(), cartLineKey: newLineKey };
      const duplicate = current.find((line) => line !== target && (line.cartLineKey || String(line.id)) === newLineKey);
      if (duplicate) return current.filter((line) => line !== target).map((line) => line === duplicate ? { ...line, quantity: line.quantity + target.quantity } : line);
      return current.map((line) => line === target ? updated : line);
    });
    setActiveCartLineKey(newLineKey);
  };

  const sendToKitchen = () => {
    const payload = {
      orderType,
      table: orderType === 'DINE_IN' ? { id: Number(selectedTable) } : null,
      roomNumber: null,
      customerName: guest?.name || null,
      notes: orderNote.trim() || null,
      items: cart.map((item) => ({
        productId: Number(item.id),
        quantity: item.quantity,
        notes: item.notes || null,
        modifiers: (item.modifiers || []).map((modifier) => ({ id: Number(modifier.id) })),
      })),
    };
    const signature = JSON.stringify(payload);
    if (submitKeyRef.current.signature !== signature) {
      submitKeyRef.current = { signature, key: globalThis.crypto?.randomUUID?.() ?? `pos-${Date.now()}-${Math.random().toString(36).slice(2)}` };
    }
    setSubmittedOrder(null);
    submitOrderMutation.mutate({ ...payload, idempotencyKey: submitKeyRef.current.key });
  };

  const resetOrder = () => {
    clearCart();
    setSelectedTable('');
    setTableSelectionWarning('');
    setGuest(null);
    setGuestQuery('');
    setOrderNote('');
    setCartOpen(false);
    setSubmittedOrder(null);
    setActiveCartLineKey(null);
    submitKeyRef.current = { signature: null, key: null };
  };

  const canSubmitOrder = cart.length > 0 && cartOptionsReady && !taxQuery.isLoading && !taxQuery.isError
    && !tablesQuery.isLoading && validDineInTable && !submitOrderMutation.isPending;
  const canPayNow = cart.length > 0 && cartOptionsReady && !taxQuery.isLoading && !taxQuery.isError
    && !tablesQuery.isLoading && !shiftQuery.isLoading && !shiftQuery.isError
    && Boolean(shiftQuery.data) && validDineInTable && !submitOrderMutation.isPending;

  return (
    <div className={`foodpos-checkout${isDesktopOrderPanel ? ' foodpos-checkout-persistent' : ''}`}>
      <div className="foodpos-scroll-area">
        <header className="foodpos-topbar">
          <NavLink to={ROUTES.POS_CHECKOUT} className="foodpos-terminal-brand" aria-label="Nexus POS cashier terminal">
            <span className="foodpos-brand-mark">N</span><span>Nexus<span>POS</span></span>
          </NavLink>
          <nav className="foodpos-terminal-nav" aria-label="Cashier pages">
            {can('view_dashboard') && <NavLink to={ROUTES.DASHBOARD}><DashboardRoundedIcon /><span>Dashboard</span></NavLink>}
            {can('view_tables') && <NavLink to={ROUTES.POS_TABLES}><TableRestaurantRoundedIcon /><span>Tables</span></NavLink>}
            {can('view_orders') && <NavLink to={ROUTES.POS_ORDERS}><ReceiptLongRoundedIcon /><span>Orders</span></NavLink>}
            {can('view_kitchen') && <NavLink to={ROUTES.POS_KITCHEN}><LocalDiningRoundedIcon /><span>Kitchen</span></NavLink>}
          </nav>
          <div className="foodpos-search-box">
            <SearchRoundedIcon aria-hidden="true" />
            <input
              type="search"
              aria-label="Search dish name, ingredient, or SKU"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search dish name or ingredient"
            />
            {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear search"><CloseRoundedIcon /></button>}
          </div>
          <NavLink className={`foodpos-shift-indicator${shiftQuery.data ? ' is-open' : ''}`} to="/pos/shift" aria-label={shiftQuery.data ? 'Cashier shift is open' : 'Cashier shift is closed; open shift'}>
            <PointOfSaleRoundedIcon aria-hidden="true" /><span>{shiftQuery.isLoading ? 'Checking shift' : shiftQuery.isError ? 'Shift status' : shiftQuery.data ? 'Shift open' : 'Open shift'}</span>
          </NavLink>
          <button
            type="button"
            className="foodpos-theme-toggle"
            onClick={() => setThemeState(toggleThemeMode())}
            aria-label={`Switch to ${themeState.mode === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${themeState.mode === 'dark' ? 'light' : 'dark'} mode`}
          >
            {themeState.mode === 'dark' ? <LightModeRoundedIcon aria-hidden="true" /> : <DarkModeRoundedIcon aria-hidden="true" />}
            <span>{themeState.mode === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
          <div className="foodpos-staff-badge"><span className="foodpos-staff-avatar">{staffName.slice(0, 1).toUpperCase()}</span><span>{staffName}</span></div>
        </header>
        <span className="foodpos-added-announcement" role="status" aria-live="polite">{addedAnnouncement}</span>

        {submittedOrder && <div className="foodpos-order-submitted" role="status">
          <div><strong>{submittedOrder.orderNumber || `Order #${submittedOrder.id}`} sent to kitchen.</strong><span>Payment is due later. Record cash and load the receipt from Orders when the guest is ready.</span></div>
          <button type="button" onClick={() => navigate('/pos/orders')}>Open orders <ArrowForwardRoundedIcon /></button>
        </div>}

        <div className="foodpos-order-type-bar">
          <div className="foodpos-order-type" role="group" aria-label="Order type">
            {ORDER_TYPES.map((item) => {
              const IconComponent = item.Icon;
              return <button type="button" key={item.id} disabled={item.disabled} title={item.disabled ? 'Connect a hotel PMS before using room charges' : undefined} className={`${orderType === item.id ? 'selected' : ''}${item.disabled ? ' unavailable' : ''}`} aria-pressed={orderType === item.id} onClick={() => { if (item.disabled) return; setOrderType(item.id); setSelectedTable(''); setTableSelectionWarning(''); }}>
                <IconComponent aria-hidden="true" /><span>{item.label}</span>
              </button>;
            })}
          </div>
          {orderType === 'DINE_IN' ? <div className="foodpos-table-picker">
            <TableRestaurantRoundedIcon aria-hidden="true" />
            <span>Table</span>
            <select aria-label="Select dine-in table" value={selectedTable} disabled={tablesQuery.isLoading || tablesQuery.isError || availableTables.length === 0} onChange={(event) => { setSelectedTable(event.target.value); setTableSelectionWarning(''); }}>
              <option value="">{tablesQuery.isLoading ? 'Loading…' : tablesQuery.isError ? 'Unavailable' : 'Choose table'}</option>
              {availableTables.map((table) => <option key={table.id} value={String(table.id)}>{table.name}{table.capacity ? ` · ${table.capacity} seats` : ''}</option>)}
            </select>
            <span className="foodpos-table-count">{tablesQuery.isLoading ? '…' : tablesQuery.isError ? <button type="button" onClick={() => tablesQuery.refetch()}>Retry</button> : `${availableTables.length} open`}</span>
          </div> : <span className="foodpos-order-mode-note"><TakeoutDiningRoundedIcon aria-hidden="true" /> Ready for takeaway</span>}
        </div>

        <div className="foodpos-menu-layout">
        <nav className="foodpos-categories" aria-label="Menu categories">
          {categories.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={`${category === item.id ? 'selected' : ''} category-tone-${index % 6}`}
              aria-pressed={category === item.id}
              onClick={() => setCategory(item.id)}
            >
              <span className="category-icon"><CategoryVisual category={item} product={categoryProducts.get(item.id) || (item.id === ALL_CATEGORIES ? products[0] : null)} /></span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="foodpos-menu-content">
        <section className="foodpos-section">
          <header className="foodpos-section-heading">
            <div>
              <h1>{search ? 'Search results' : selectedCategory?.name || 'All dishes'}</h1>
              <p>{search ? `${visibleProducts.length} matching dishes` : `${visibleProducts.length} dishes${popularProducts.length ? ' · best sellers shown first' : ''}`}</p>
            </div>
          </header>

          {productsQuery.isLoading ? (
            <div className="foodpos-product-grid">{[0, 1, 2, 3, 4, 5, 6, 7].map((item) => <div className="foodpos-product-skeleton" key={item} />)}</div>
          ) : productsQuery.isError ? (
            <div className="foodpos-empty-state foodpos-error-state" role="alert"><RestaurantMenuRoundedIcon /><strong>Menu could not be loaded</strong><span>Check the connection and try again.</span><button type="button" onClick={() => productsQuery.refetch()}><RefreshRoundedIcon /> Try again</button></div>
          ) : orderedMenuProducts.length ? (
            <div className="foodpos-product-grid">{orderedMenuProducts.map((product) => <FoodProductCard key={product.id} product={product} count={cart.filter((item) => String(item.id) === String(product.id)).reduce((sum, item) => sum + item.quantity, 0)} onSelect={beginAdd} />)}</div>
          ) : (
            <div className="foodpos-empty-state"><ShoppingBagOutlinedIcon /><strong>{search ? 'No dishes match your search' : 'No dishes in this category yet'}</strong><span>Choose another category or clear your search.</span></div>
          )}

          {categoriesQuery.isError && <p className="foodpos-data-note" role="status">Category service is unavailable; showing categories available with menu items.</p>}
        </section>
        </div>
        </div>
      </div>

      <div className="foodpos-action-bar" aria-label="Cashier actions" aria-live="polite">
        <div className="foodpos-action-order"><span>Current order</span><strong>{itemCount} {itemCount === 1 ? 'item' : 'items'} <i /> {money(total)}</strong></div>
        <div className="foodpos-action-buttons">
          <button type="button" className="foodpos-action-secondary" onClick={() => { if (window.confirm('Clear this order and start again?')) resetOrder(); }} disabled={!cart.length}><RestartAltRoundedIcon /> <span>Reset</span></button>
          {can('view_orders') && <button type="button" className="foodpos-action-secondary" onClick={() => navigate(ROUTES.POS_ORDERS)}><ReceiptLongRoundedIcon /> <span>View orders</span></button>}
          {isDesktopOrderPanel ? <>
            <button type="button" className="foodpos-action-kitchen" onClick={sendToKitchen} disabled={!canSubmitOrder}><LocalDiningRoundedIcon /><span>{submitOrderMutation.isPending ? 'Sending…' : 'Send to kitchen'}</span></button>
            <button type="button" className="foodpos-action-pay" onClick={() => setShowPayment(true)} disabled={!canPayNow}><PaymentsRoundedIcon /><span>Pay now · {money(total)}</span></button>
          </> : <button type="button" className="foodpos-action-pay" onClick={() => setCartOpen(true)}><PointOfSaleRoundedIcon /><span>{cart.length ? 'Review order' : 'Start order'}</span><ArrowForwardRoundedIcon /></button>}
        </div>
      </div>

      {(cartOpen || isDesktopOrderPanel) && <div className={`foodpos-drawer-backdrop${isDesktopOrderPanel ? ' foodpos-cart-persistent' : ''}`} role="presentation" onMouseDown={(event) => { if (!isDesktopOrderPanel && event.target === event.currentTarget) setCartOpen(false); }}>
        <section className="foodpos-order-drawer" role={isDesktopOrderPanel ? 'complementary' : 'dialog'} aria-modal={isDesktopOrderPanel ? undefined : 'true'} aria-labelledby="foodpos-cart-title">
          <header className="foodpos-drawer-heading">
            <div><p className="foodpos-overline">CURRENT ORDER</p><h2 id="foodpos-cart-title">{selectedTableRecord?.name || (orderType === 'TAKEAWAY' ? 'Takeaway order' : 'New order')}</h2><span>{itemCount} {itemCount === 1 ? 'item' : 'items'}{guest ? ` · ${guest.name}` : ''}</span></div>
            {!isDesktopOrderPanel && <button type="button" className="foodpos-icon-button" onClick={() => setCartOpen(false)} aria-label="Close order"><CloseRoundedIcon /></button>}
          </header>

          <div className="foodpos-drawer-scroll">
            <section className="foodpos-context-section foodpos-guest-section">
              <label className="foodpos-field">Guest <span>Optional for restaurant orders</span>
                <input value={guestQuery} onChange={(event) => { setGuestQuery(event.target.value); setGuest(null); }} placeholder="Search guest name or phone" />
              </label>
              {guest && <div className="foodpos-selected-guest"><span>{guest.name}</span><button type="button" onClick={() => setGuest(null)} aria-label="Remove selected guest"><CloseRoundedIcon /></button></div>}
              {!guest && guestQuery.trim().length >= 2 && <div className="foodpos-guest-results">{guestsQuery.isLoading ? <span>Searching guests…</span> : guestsQuery.isError ? <span role="alert">Guest search failed. Try again.</span> : guestsQuery.data?.length ? guestsQuery.data.slice(0, 5).map((person) => <button type="button" key={person.id} onClick={() => { setGuest(person); setGuestQuery(''); }}>{person.name}<small>{person.phone || ''}</small></button>) : <span>No matching guests</span>}</div>}
            </section>

            <div className="foodpos-cart-lines">
              {cart.length === 0 ? <div className="foodpos-cart-empty"><ShoppingBagOutlinedIcon /><strong>Your order is empty</strong><span>Tap a dish to add it directly to this order.</span></div> : cart.map((item, itemIndex) => {
                const unit = Number(item.price) + (item.modifiers || []).reduce((sum, modifier) => sum + modifierPrice(modifier), 0);
                const lineKey = item.cartLineKey || String(item.id);
                const modifierQuery = cartModifierQueries[itemIndex];
                const missingRequired = modifierQuery?.data?.some((group) => {
                  const count = (item.modifiers || []).filter((modifier) => String(modifier.groupId) === String(group.id)).length;
                  return count < Number(group.minSelect ?? (group.required ? 1 : 0));
                });
                const editing = activeCartLineKey === lineKey;
                return <div className="foodpos-cart-row" key={lineKey}>
                  <article className="foodpos-cart-line">
                    <div className="foodpos-cart-line-details"><strong>{item.name}</strong><small>{(item.modifiers || []).map((modifier) => modifier.name).join(', ') || money(item.price)}{item.notes ? ` · ${item.notes}` : ''}</small><button type="button" className="foodpos-line-options-toggle" aria-expanded={editing} onClick={() => editCartLine(item)}>{missingRequired ? 'Choose required options' : editing ? 'Close options' : 'Options or note'}</button>{missingRequired && <span className="foodpos-required-options">Required options needed</span>}</div>
                    <div className="foodpos-quantity"><button type="button" onClick={() => removeFromCart(lineKey)} aria-label={`Remove one ${item.name}`}><RemoveRoundedIcon /></button><span>{item.quantity}</span><button type="button" onClick={() => addToCart(item, { modifiers: item.modifiers, notes: item.notes })} aria-label={`Add one ${item.name}`}><AddRoundedIcon /></button></div>
                    <strong className="foodpos-line-total">{money(unit * item.quantity)}</strong>
                  </article>
                  {editing && <div className="foodpos-cart-line-customizer">
                    {modifierQuery?.isLoading ? <div className="foodpos-state">Loading dish options…</div> : modifierQuery?.isError ? <div className="foodpos-inline-error" role="alert">Dish options could not be loaded. <button type="button" onClick={() => modifierQuery.refetch()}><RefreshRoundedIcon /> Retry</button></div> : <>
                      {groups.length === 0 ? <p className="foodpos-inline-empty">No modifiers are configured for this dish.</p> : groups.map((group) => <fieldset key={group.id}><legend>{group.name}{group.required && <span>Required</span>}</legend><p>{group.multiSelect ? `Choose up to ${group.maxSelect ?? 'any'} options` : 'Choose one option'}</p><div>{(group.modifiers || []).filter((modifier) => modifier.available !== false).map((modifier) => { const checked = selectedModifiers.some((choice) => choice.id === modifier.id); return <button type="button" key={modifier.id} className={checked ? 'selected' : ''} aria-pressed={checked} onClick={() => toggleModifier({ ...modifier, groupId: group.id }, group)}><span>{modifier.name}</span><strong>{modifierPrice(modifier) > 0 ? `+ ${money(modifierPrice(modifier))}` : 'Included'}</strong></button>; })}</div></fieldset>)}
                      <label className="foodpos-field">Item note<input maxLength={250} value={itemNote} onChange={(event) => setItemNote(event.target.value)} placeholder="Optional preparation note" /></label>
                      <button type="button" className="foodpos-primary-action foodpos-save-options" disabled={groups.some((group) => selectedModifiers.filter((choice) => String(choice.groupId) === String(group.id)).length < Number(group.minSelect ?? (group.required ? 1 : 0)))} onClick={saveCartLineOptions}>Save options</button>
                    </>}
                  </div>}
                </div>;
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
            {shiftQuery.isLoading ? <div className="foodpos-state">Checking cashier shift…</div> : shiftQuery.isError ? <div className="foodpos-inline-error" role="alert">Shift status could not be checked. <button type="button" onClick={() => shiftQuery.refetch()}>Retry</button></div> : !shiftQuery.data ? <div className="foodpos-shift-notice"><span>Open a cashier shift before recording cash payment.</span><button type="button" onClick={() => navigate('/pos/shift')}>Open shift</button></div> : null}
            {cart.length > 0 && !validDineInTable && <div className="foodpos-checkout-blocker" role="status">{availableTables.length ? 'Select an available table to send or pay for this dine-in order.' : 'No available tables. Ask a manager to add or release a table, or switch to takeaway.'}</div>}
            {cart.length > 0 && !cartOptionsReady && <div className="foodpos-checkout-blocker" role="status">{cartModifierQueries.some((query) => query.isError) ? 'Dish options could not be loaded. Retry the options on each affected item before checkout.' : cartModifierQueries.some((query) => query.isLoading) ? 'Loading dish options…' : 'Choose the required dish options before checkout.'}</div>}
            {submitOrderMutation.isError && <div className="foodpos-inline-error" role="alert">Order could not be sent. {submitOrderMutation.error?.response?.data?.message || 'Check the connection and retry.'}</div>}
            {tableSelectionWarning && <div className="foodpos-inline-error" role="alert">{tableSelectionWarning}</div>}
            <button type="button" className="foodpos-deferred-action"
              disabled={!cart.length || !cartOptionsReady || taxQuery.isLoading || taxQuery.isError || tablesQuery.isLoading || !validDineInTable || submitOrderMutation.isPending}
              onClick={sendToKitchen}>
              <span>{submitOrderMutation.isPending ? 'Sending order…' : 'Send to kitchen · pay later'}</span>
              {!submitOrderMutation.isPending && <span>{money(total)} <ArrowForwardRoundedIcon /></span>}
            </button>
            <button type="button" className="foodpos-pay-now-action"
              disabled={!cart.length || !cartOptionsReady || taxQuery.isLoading || taxQuery.isError || tablesQuery.isLoading || shiftQuery.isLoading || shiftQuery.isError || !shiftQuery.data || !validDineInTable || submitOrderMutation.isPending}
              onClick={() => { setCartOpen(false); setShowPayment(true); }}>
              Pay now · {money(total)}
            </button>
          </footer>
        </section>
      </div>}

      {showPayment && <Suspense fallback={<div className="foodpos-dialog-backdrop"><div className="foodpos-loading-panel">Loading payment…</div></div>}><PaymentModal orderType={orderType} tableId={Number(selectedTable)} guestName={guest?.name} orderNotes={orderNote} onClose={() => setShowPayment(false)} /></Suspense>}
    </div>
  );
}
