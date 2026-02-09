import { SellerUser } from '../lib/supabase';
import { Icons } from '../components/Icons';

interface DashboardProps {
    seller: SellerUser;
}

export default function Dashboard({ seller }: DashboardProps) {
    return (
        <div className="dashboard">
            <header className="page-header">
                <h1>Welcome, {seller.seller?.store_name}!</h1>
                <p>Manage your store from this dashboard</p>
            </header>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon"><Icons.Products /></div>
                    <div className="stat-info">
                        <h3>Products</h3>
                        <p className="stat-value">--</p>
                        <span className="stat-label">Total products in your store</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><Icons.Orders /></div>
                    <div className="stat-info">
                        <h3>Orders</h3>
                        <p className="stat-value">--</p>
                        <span className="stat-label">Coming soon</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon"><Icons.Revenue /></div>
                    <div className="stat-info">
                        <h3>Revenue</h3>
                        <p className="stat-value">--</p>
                        <span className="stat-label">Coming soon</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">{seller.seller?.is_verified ? <Icons.Check /> : <Icons.Pending />}</div>
                    <div className="stat-info">
                        <h3>Status</h3>
                        <p className="stat-value">
                            {seller.seller?.is_verified ? 'Verified' : 'Pending'}
                        </p>
                        <span className="stat-label">
                            {seller.seller?.is_active ? 'Account Active' : 'Account Inactive'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <a href="/products" className="action-card">
                        <span className="action-icon"><Icons.Add /></span>
                        <span className="action-label">Add Product</span>
                    </a>
                    <div className="action-card disabled">
                        <span className="action-icon"><Icons.Analytics /></span>
                        <span className="action-label">View Analytics</span>
                        <span className="coming-soon">Coming Soon</span>
                    </div>
                    <div className="action-card disabled">
                        <span className="action-icon"><Icons.Store /></span>
                        <span className="action-label">Edit Store</span>
                        <span className="coming-soon">Coming Soon</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
