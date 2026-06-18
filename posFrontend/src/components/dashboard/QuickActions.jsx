import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes.js';
import AddCircleRoundedIcon from '@mui/icons-material/AddCircleRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';
import AttachMoneyRoundedIcon from '@mui/icons-material/AttachMoneyRounded';

const ACTIONS = [
  { label: 'New Order', icon: PointOfSaleRoundedIcon, color: 'bg-violet-500/10 text-violet-500', route: ROUTES.CHECKOUT },
  { label: 'Add Product', icon: AddCircleRoundedIcon, color: 'bg-emerald-500/10 text-emerald-500', route: ROUTES.CREATEPRODUCT },
  { label: 'Inventory', icon: WarehouseRoundedIcon, color: 'bg-amber-500/10 text-amber-500', route: ROUTES.INVENTORY },
  { label: 'Expenses', icon: AttachMoneyRoundedIcon, color: 'bg-red-500/10 text-red-500', route: ROUTES.FINANCE_EXPENSES },
  { label: 'Products', icon: Inventory2RoundedIcon, color: 'bg-gray-500/10 text-gray-400', route: ROUTES.PRODUCTS },
  { label: 'Users', icon: PeopleAltRoundedIcon, color: 'bg-blue-500/10 text-blue-500', route: ROUTES.USERS },
];

export default function QuickActions() {
  const navigate = useNavigate();
  return (
    <div className="bg-bg-secondary rounded-2xl border border-border-primary p-5">
      <h3 className="text-sm font-black text-text-primary uppercase tracking-wider mb-4">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map(a => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              onClick={() => navigate(a.route)}
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-bg-tertiary transition-all group"
            >
              <div className={`p-2 rounded-xl ${a.color} transition-transform group-hover:scale-110`}>
                <Icon sx={{ fontSize: 20 }} />
              </div>
              <span className="text-[10px] font-semibold text-text-muted group-hover:text-text-primary text-center leading-tight">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
