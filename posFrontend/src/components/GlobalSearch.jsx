import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAllProducts } from '../services/api.js';
import { ROUTES } from '../routes.js';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import InventoryRoundedIcon from '@mui/icons-material/InventoryRounded';
import AssessmentRoundedIcon from '@mui/icons-material/AssessmentRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';

const QUICK_LINKS = [
  { id: 'nav-dashboard', label: 'Dashboard', subtitle: 'Main overview', icon: DashboardRoundedIcon, route: ROUTES.DASHBOARD },
  { id: 'nav-checkout', label: 'POS Checkout', subtitle: 'Process a new sale', icon: PointOfSaleRoundedIcon, route: ROUTES.CHECKOUT },
  { id: 'nav-products', label: 'Products', subtitle: 'Manage product catalog', icon: InventoryRoundedIcon, route: ROUTES.PRODUCTS },
  { id: 'nav-reports', label: 'Reports', subtitle: 'Sales & analytics', icon: AssessmentRoundedIcon, route: ROUTES.REPORTS },
  { id: 'nav-expenses', label: 'Expenses', subtitle: 'Finance management', icon: AttachMoneyRoundedIcon, route: ROUTES.FINANCE_EXPENSES },
  { id: 'nav-sales', label: 'Transactions', subtitle: 'Sales history', icon: ReceiptLongRoundedIcon, route: ROUTES.TRANSACTIONS },
];

export function useGlobalSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return { open, setOpen };
}

export default function GlobalSearch({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  const { data: products = [] } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => getAllProducts().then(r => r.data),
    enabled: open,
    staleTime: 60_000,
  });

  const filteredProducts = query.trim()
    ? products.filter(p => p.name?.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : [];

  const filteredLinks = QUICK_LINKS.filter(l =>
    !query.trim() || l.label.toLowerCase().includes(query.toLowerCase()) || l.subtitle.toLowerCase().includes(query.toLowerCase())
  );

  const allResults = [
    ...filteredLinks.map(l => ({ ...l, category: 'Navigation' })),
    ...filteredProducts.map(p => ({
      id: `prod-${p.id}`,
      label: p.name,
      subtitle: `KSh ${Number(p.price ?? 0).toLocaleString()} · ${p.quantity ?? 0} in stock`,
      icon: StorefrontRoundedIcon,
      route: `/products/${p.id}`,
      category: 'Products',
    })),
  ];

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = useCallback((item) => {
    navigate(item.route);
    onClose();
    setQuery('');
  }, [navigate, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults[activeIdx]) {
      handleSelect(allResults[activeIdx]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  // Group results by category
  const grouped = allResults.reduce((acc, item, idx) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push({ ...item, _idx: idx });
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      <div
        className="max-w-2xl w-full bg-bg-secondary rounded-2xl shadow-2xl border border-border-primary overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-primary">
          <SearchRoundedIcon className="text-text-muted shrink-0" sx={{ fontSize: 22 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search products, orders, navigation..."
            className="flex-1 bg-transparent text-text-primary text-base placeholder:text-text-muted outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-text-muted hover:text-text-primary">
              <CloseRoundedIcon sx={{ fontSize: 18 }} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 px-2 py-1 text-[10px] text-text-muted bg-bg-tertiary border border-border-primary rounded font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-2">
          {allResults.length === 0 ? (
            <div className="py-12 text-center">
              <SearchRoundedIcon sx={{ fontSize: 40 }} className="text-text-muted opacity-30 mx-auto mb-3" />
              <p className="text-text-muted text-sm">No results found for &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <p className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  {category}
                </p>
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item._idx === activeIdx;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      onMouseEnter={() => setActiveIdx(item._idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-brand-primary/10' : 'hover:bg-bg-tertiary'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${isActive ? 'bg-brand-primary/20 text-brand-primary' : 'bg-bg-tertiary text-text-muted'}`}>
                        <Icon sx={{ fontSize: 16 }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isActive ? 'text-text-primary' : 'text-text-primary'}`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-text-muted truncate">{item.subtitle}</p>
                      </div>
                      {isActive && (
                        <kbd className="text-[10px] text-text-muted bg-bg-tertiary border border-border-primary px-1.5 py-0.5 rounded font-mono shrink-0">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-border-primary flex items-center gap-4 text-[11px] text-text-muted">
          <span><kbd className="font-mono bg-bg-tertiary border border-border-primary px-1 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono bg-bg-tertiary border border-border-primary px-1 rounded">↵</kbd> select</span>
          <span><kbd className="font-mono bg-bg-tertiary border border-border-primary px-1 rounded">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
