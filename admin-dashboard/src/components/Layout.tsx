import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut, supabase } from '../lib/supabase';
import { useEffect, useState } from 'react';
import { Icons } from './Icons';

const navItems = [
  { path: '/dashboard', icon: <Icons.Dashboard />, label: 'Dashboard' },
  { path: '/products', icon: <Icons.Products />, label: 'Products' },
  { path: '/orders', icon: <Icons.Orders />, label: 'Orders' },
  { path: '/users', icon: <Icons.Users />, label: 'Users' },
  { path: '/inventory', icon: <Icons.Inventory />, label: 'Inventory' },
  { path: '/categories', icon: <Icons.Categories />, label: 'Categories' },
  { path: '/sellers', icon: <Icons.Sellers />, label: 'Sellers' },
  { path: '/coupons', icon: <Icons.Ticket />, label: 'Coupons' },
  { path: '/reviews', icon: <Icons.Shield />, label: 'Reviews' },
];

export default function Layout() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email || '');
    });
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon"><Icons.Logo /></div>
            <div>
              <h1>E-Commerce</h1>
              <span>Admin Dashboard</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <p className="nav-section-title">Main Menu</p>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-footer">
          <p className="nav-section-title">Account</p>
          {userEmail && (
            <p className="user-email">{userEmail}</p>
          )}
          <button onClick={handleSignOut} className="sign-out-btn">
            <span className="icon"><Icons.SignOut /></span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
