import { useEffect, useState } from 'react';
import { SellerUser, supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';

interface DashboardProps {
    seller: SellerUser;
}

interface DashboardStats {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    pendingOrders: number;
    totalRevenue: number;
    thisMonthRevenue: number;
}

interface RecentOrderItem {
    id: string;
    order_id: string;
    product_name: string;
    product_image: string | null;
    quantity: number;
    total_price: number;
    created_at: string;
    order?: {
        order_number: string;
        status: string;
        payment_status: string;
        created_at: string;
        delivery_name: string;
    };
}

export default function Dashboard({ seller }: DashboardProps) {
    const [stats, setStats] = useState<DashboardStats>({
        totalProducts: 0,
        activeProducts: 0,
        totalOrders: 0,
        pendingOrders: 0,
        totalRevenue: 0,
        thisMonthRevenue: 0,
    });
    const [recentOrders, setRecentOrders] = useState<RecentOrderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [topProducts, setTopProducts] = useState<{ name: string; sold: number; revenue: number }[]>([]);

    useEffect(() => {
        if (seller.seller?.id) {
            fetchDashboardData();
        }
    }, [seller.seller?.id]);

    async function fetchDashboardData() {
        try {
            setLoading(true);
            const sellerId = seller.seller!.id;

            // 1. Fetch product stats
            const { data: products } = await supabase
                .from('products')
                .select('id, is_active')
                .eq('seller_id', sellerId);

            const totalProducts = products?.length || 0;
            const activeProducts = products?.filter(p => p.is_active).length || 0;
            const productIds = products?.map(p => p.id) || [];

            // 2. Fetch order_items for this seller's products
            let allOrderItems: any[] = [];
            if (productIds.length > 0) {
                const { data: orderItems } = await supabase
                    .from('order_items')
                    .select(`
                        id,
                        order_id,
                        product_id,
                        product_name,
                        product_image,
                        quantity,
                        unit_price,
                        total_price,
                        created_at
                    `)
                    .in('product_id', productIds);

                allOrderItems = orderItems || [];
            }

            // 3. Get unique order IDs and fetch order details
            const uniqueOrderIds = [...new Set(allOrderItems.map(oi => oi.order_id))];
            let ordersMap = new Map<string, any>();

            if (uniqueOrderIds.length > 0) {
                const { data: orders } = await supabase
                    .from('orders')
                    .select('id, order_number, status, payment_status, created_at, delivery_name')
                    .in('id', uniqueOrderIds);

                if (orders) {
                    for (const o of orders) {
                        ordersMap.set(o.id, o);
                    }
                }
            }

            // 4. Calculate stats
            const totalRevenue = allOrderItems.reduce((sum, oi) => sum + (oi.total_price || 0), 0);

            // This month's revenue
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const thisMonthRevenue = allOrderItems
                .filter(oi => oi.created_at >= startOfMonth)
                .reduce((sum, oi) => sum + (oi.total_price || 0), 0);

            // Count unique orders and pending orders
            const pendingOrders = uniqueOrderIds.filter(id => {
                const order = ordersMap.get(id);
                return order && ['pending', 'confirmed', 'processing'].includes(order.status);
            }).length;

            setStats({
                totalProducts,
                activeProducts,
                totalOrders: uniqueOrderIds.length,
                pendingOrders,
                totalRevenue,
                thisMonthRevenue,
            });

            // 5. Build recent orders list (latest 5 order_items with order details)
            const enrichedItems: RecentOrderItem[] = allOrderItems
                .map(oi => ({
                    ...oi,
                    order: ordersMap.get(oi.order_id),
                }))
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 8);

            setRecentOrders(enrichedItems);

            // 6. Top selling products
            const productSales = new Map<string, { name: string; sold: number; revenue: number }>();
            for (const oi of allOrderItems) {
                const existing = productSales.get(oi.product_name) || { name: oi.product_name, sold: 0, revenue: 0 };
                existing.sold += oi.quantity;
                existing.revenue += oi.total_price || 0;
                productSales.set(oi.product_name, existing);
            }
            const sorted = [...productSales.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5);
            setTopProducts(sorted);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }

    function formatCurrency(amount: number) {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }

    function getStatusClass(status: string) {
        switch (status) {
            case 'delivered': return 'status-delivered';
            case 'shipped': return 'status-shipped';
            case 'cancelled': return 'status-cancelled';
            case 'pending': return 'status-pending';
            default: return 'status-processing';
        }
    }

    return (
        <div className="dashboard">
            <header className="page-header">
                <div>
                    <h1>Welcome, {seller.seller?.store_name}!</h1>
                    <p>Manage your store from this dashboard</p>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon stat-icon-blue"><Icons.Products /></div>
                    <div className="stat-info">
                        <h3>Products</h3>
                        <p className="stat-value">{loading ? '...' : stats.totalProducts}</p>
                        <span className="stat-label">
                            {loading ? '' : `${stats.activeProducts} active`}
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-green"><Icons.Orders /></div>
                    <div className="stat-info">
                        <h3>Orders</h3>
                        <p className="stat-value">{loading ? '...' : stats.totalOrders}</p>
                        <span className="stat-label">
                            {loading ? '' : stats.pendingOrders > 0 ? `${stats.pendingOrders} pending` : 'All fulfilled'}
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon stat-icon-purple"><Icons.Revenue /></div>
                    <div className="stat-info">
                        <h3>Revenue</h3>
                        <p className="stat-value">{loading ? '...' : formatCurrency(stats.totalRevenue)}</p>
                        <span className="stat-label">
                            {loading ? '' : `${formatCurrency(stats.thisMonthRevenue)} this month`}
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon">
                        {seller.seller?.is_verified ? <Icons.Check /> : <Icons.Pending />}
                    </div>
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

            {/* Quick Actions */}
            <div className="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                    <a href="/products" className="action-card">
                        <span className="action-icon"><Icons.Add /></span>
                        <span className="action-label">Add Product</span>
                    </a>
                    <a href="/orders" className="action-card">
                        <span className="action-icon"><Icons.Orders /></span>
                        <span className="action-label">View Orders</span>
                    </a>
                    <a href="/reviews" className="action-card">
                        <span className="action-icon"><Icons.StarIcon /></span>
                        <span className="action-label">View Reviews</span>
                    </a>
                </div>
            </div>

            {/* Recent Sales & Top Products side by side */}
            <div className="dashboard-grid">
                {/* Recent Sales */}
                <div className="dashboard-section">
                    <div className="section-header">
                        <h2>Recent Sales</h2>
                        <a href="/orders" className="view-all-link">View All →</a>
                    </div>
                    {loading ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : recentOrders.length === 0 ? (
                        <div className="empty-mini">
                            <Icons.Orders />
                            <p>No sales yet. Once customers purchase your products, they'll appear here.</p>
                        </div>
                    ) : (
                        <div className="recent-sales-list">
                            {recentOrders.map((item) => (
                                <div key={item.id} className="sale-item">
                                    <div className="sale-product-img">
                                        {item.product_image ? (
                                            <img src={item.product_image} alt={item.product_name} />
                                        ) : (
                                            <div className="sale-no-img"><Icons.Products /></div>
                                        )}
                                    </div>
                                    <div className="sale-details">
                                        <h4>{item.product_name}</h4>
                                        <p className="sale-meta">
                                            {item.order?.order_number || 'Order'} • Qty: {item.quantity}
                                        </p>
                                        {item.order && (
                                            <span className={`order-status-badge ${getStatusClass(item.order.status)}`}>
                                                {item.order.status}
                                            </span>
                                        )}
                                    </div>
                                    <div className="sale-amount">
                                        <strong>{formatCurrency(item.total_price)}</strong>
                                        {item.order && (
                                            <span className="sale-date">{formatDate(item.order.created_at)}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Top Products */}
                <div className="dashboard-section">
                    <h2>Top Selling Products</h2>
                    {loading ? (
                        <div className="loading"><div className="spinner"></div></div>
                    ) : topProducts.length === 0 ? (
                        <div className="empty-mini">
                            <Icons.Products />
                            <p>No sales data yet.</p>
                        </div>
                    ) : (
                        <div className="top-products-list">
                            {topProducts.map((product, index) => (
                                <div key={product.name} className="top-product-item">
                                    <span className="rank-badge">#{index + 1}</span>
                                    <div className="top-product-info">
                                        <h4>{product.name}</h4>
                                        <p>{product.sold} sold</p>
                                    </div>
                                    <strong className="top-product-revenue">{formatCurrency(product.revenue)}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
