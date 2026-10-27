import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useKeycloak } from '@react-keycloak/web';
import { ROUTES } from '../routes.js';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import TableRestaurantRoundedIcon from '@mui/icons-material/TableRestaurantRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import LocalDiningRoundedIcon from '@mui/icons-material/LocalDiningRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import BookOnlineRoundedIcon from '@mui/icons-material/BookOnlineRounded';
import AccessAlarmRoundedIcon from '@mui/icons-material/AccessAlarmRounded';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import './checkout/hotel-pos.css';

const NAV_ITEMS = [
  { to: ROUTES.POS_TABLES, Icon: TableRestaurantRoundedIcon, label: 'Floor plan', mobile: true },
  { to: ROUTES.POS_CHECKOUT, Icon: PointOfSaleRoundedIcon, label: 'Dishes', mobile: true },
  { to: ROUTES.POS_ORDERS, Icon: ReceiptLongRoundedIcon, label: 'Orders', mobile: true },
  { to: ROUTES.POS_KITCHEN, Icon: LocalDiningRoundedIcon, label: 'Kitchen', mobile: true },
  { to: ROUTES.POS_RESERVATIONS, Icon: BookOnlineRoundedIcon, label: 'Bookings' },
  { to: ROUTES.POS_CUSTOMERS, Icon: GroupsRoundedIcon, label: 'Guests' },
  { to: ROUTES.POS_SHIFT, Icon: AccessAlarmRoundedIcon, label: 'Shift' },
];

export default function POSLayout() {
  const { keycloak } = useKeycloak();
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const staffName = keycloak?.tokenParsed?.name
    || keycloak?.tokenParsed?.preferred_username
    || 'Staff member';
  const initials = staffName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="foodpos-shell">
      <aside className="foodpos-sidebar" aria-label="Restaurant navigation">
        <NavLink to={ROUTES.POS_CHECKOUT} className="foodpos-brand" aria-label="FoodPOS home">
          <span className="foodpos-brand-mark">F</span>
          <span className="foodpos-brand-name">FoodPOS</span>
        </NavLink>

        <nav className="foodpos-nav" aria-label="POS pages">
          <p className="foodpos-nav-label">Restaurant</p>
          {NAV_ITEMS.map((item) => {
            const IconComponent = item.Icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end
                title={item.label}
                aria-label={item.label}
                className={({ isActive }) => `foodpos-nav-link${isActive ? ' active' : ''}${item.mobile ? ' mobile-primary' : ' mobile-secondary'}`}
                onClick={() => setMobileMoreOpen(false)}
              >
                <IconComponent aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="foodpos-sidebar-bottom">
          <NavLink to={ROUTES.DASHBOARD} className="foodpos-nav-link foodpos-admin-link">
            <DashboardRoundedIcon aria-hidden="true" /><span>Manager dashboard</span>
          </NavLink>
          <div className="foodpos-profile">
            <span className="foodpos-profile-avatar" aria-hidden="true">{initials || 'S'}</span>
            <span className="foodpos-profile-copy"><strong>{staffName}</strong><small>Signed in</small></span>
            <button type="button" className="foodpos-signout" onClick={() => keycloak?.logout()} aria-label="Sign out" title="Sign out">
              <LogoutRoundedIcon />
            </button>
          </div>
        </div>
      </aside>

      <main className="foodpos-page"><Outlet /></main>

      <nav className="foodpos-mobile-nav" aria-label="Quick navigation">
        {NAV_ITEMS.filter((item) => item.mobile).map((item) => {
          const IconComponent = item.Icon;
          return <NavLink key={item.to} to={item.to} end aria-label={item.label} className={({ isActive }) => isActive ? 'active' : ''}>
            <IconComponent aria-hidden="true" /><span>{item.label}</span>
          </NavLink>;
        })}
        <button type="button" aria-expanded={mobileMoreOpen} onClick={() => setMobileMoreOpen((open) => !open)}>
          <MoreHorizRoundedIcon aria-hidden="true" /><span>More</span>
        </button>
        {mobileMoreOpen && (
          <div className="foodpos-more-menu">
            {NAV_ITEMS.filter((item) => !item.mobile).map((item) => {
              const IconComponent = item.Icon;
              return <NavLink key={item.to} to={item.to} onClick={() => setMobileMoreOpen(false)}>
                <IconComponent aria-hidden="true" /><span>{item.label}</span>
              </NavLink>;
            })}
            <NavLink to={ROUTES.DASHBOARD} onClick={() => setMobileMoreOpen(false)}>
              <DashboardRoundedIcon aria-hidden="true" /><span>Manager dashboard</span>
            </NavLink>
            <button type="button" onClick={() => keycloak?.logout()}>
              <LogoutRoundedIcon aria-hidden="true" /><span>Sign out</span>
            </button>
          </div>
        )}
      </nav>
    </div>
  );
}
