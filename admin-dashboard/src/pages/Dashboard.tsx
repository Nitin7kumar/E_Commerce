import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Icons } from '../components/Icons';

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  pendingOrders: number;
  lowStockItems: number;
  totalSellers: number;
  activeCategories: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    lowStockItems: 0,
    totalSellers: 0,
    activeCategories: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<{ name: string; sales: number }[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);

      // Fetch counts in parallel
      const [
        productsRes,
        ordersRes,
        usersRes,
        pendingOrdersRes,
        lowStockRes,
        sellersRes,
        categoriesRes,
        revenueRes,
        recentOrdersRes,
      ] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('products').select('id', { count: 'exact', head: true }).lt('stock', 10),
        supabase.from('sellers').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('total_amount'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
      ]);

      // Calculate total revenue
      const totalRevenue = revenueRes.data?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      setStats({
        totalProducts: productsRes.count || 0,
        totalOrders: ordersRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalRevenue,
        pendingOrders: pendingOrdersRes.count || 0,
        lowStockItems: lowStockRes.count || 0,
        totalSellers: sellersRes.count || 0,
        activeCategories: categoriesRes.count || 0,
      });

      setRecentOrders(recentOrdersRes.data || []);

      // Generate mock sales data for chart (in real app, aggregate from orders)
      const mockSalesData = [
        { name: 'Mon', sales: 4000 },
        { name: 'Tue', sales: 3000 },
        { name: 'Wed', sales: 5000 },
        { name: 'Thu', sales: 4500 },
        { name: 'Fri', sales: 6000 },
        { name: 'Sat', sales: 5500 },
        { name: 'Sun', sales: 7000 },
      ];
      setSalesData(mockSalesData);

      // Order status distribution
      const { data: ordersByStatus } = await supabase
        .from('orders')
        .select('status');

      const statusCounts = ordersByStatus?.reduce((acc: Record<string, number>, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}) || {};

      setOrderStatusData(
        Object.entries(statusCounts).map(([name, value]) => ({ name, value }))
      );

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

  function getStatusBadge(status: string) {
    const statusMap: Record<string, string> = {
      pending: 'warning',
      confirmed: 'info',
      shipped: 'info',
      delivered: 'success',
      cancelled: 'danger',
    };
    return statusMap[status] || 'neutral';
  }

  if (loading) {
    return (
      <>
        <header className="page-header">
          <h1>Dashboard</h1>
          <p>Welcome back! Here's an overview of your store.</p>
        </header>
        <div className="page-content">
          <div className="loading">
            <div className="spinner"></div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's an overview of your store.</p>
      </header>

      <div className="page-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue"><Icons.Revenue /></div>
            <div className="stat-content">
              <h3>{formatCurrency(stats.totalRevenue)}</h3>
              <p>Total Revenue</p>
              <span className="stat-change positive">↑ 12.5% from last month</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green"><Icons.Orders /></div>
            <div className="stat-content">
              <h3>{stats.totalOrders}</h3>
              <p>Total Orders</p>
              <span className="stat-change positive">↑ 8.2% from last month</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon purple"><Icons.Users /></div>
            <div className="stat-content">
              <h3>{stats.totalUsers}</h3>
              <p>Total Users</p>
              <span className="stat-change positive">↑ 5.1% from last month</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange"><Icons.Products /></div>
            <div className="stat-content">
              <h3>{stats.totalProducts}</h3>
              <p>Total Products</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon red"><Icons.Pending /></div>
            <div className="stat-content">
              <h3>{stats.pendingOrders}</h3>
              <p>Pending Orders</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon orange"><Icons.Warning /></div>
            <div className="stat-content">
              <h3>{stats.lowStockItems}</h3>
              <p>Low Stock Items</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon green"><Icons.Sellers /></div>
            <div className="stat-content">
              <h3>{stats.totalSellers}</h3>
              <p>Active Sellers</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon blue"><Icons.Categories /></div>
            <div className="stat-content">
              <h3>{stats.activeCategories}</h3>
              <p>Categories</p>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Weekly Sales</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155' }}
                  labelStyle={{ color: '#f8fafc' }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#6366f1"
                  fill="url(#colorSales)"
                />
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h3>Order Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={orderStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {orderStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="table-container">
          <div className="table-header">
            <h2>Recent Orders</h2>
            <button className="btn btn-secondary btn-sm">View All Orders</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.order_number}</strong>
                  </td>
                  <td>{formatDate(order.created_at)}</td>
                  <td>{formatCurrency(order.total_amount)}</td>
                  <td>
                    <span className={`badge ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-state">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
