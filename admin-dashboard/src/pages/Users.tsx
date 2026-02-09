import { useEffect, useState } from 'react';
import { supabase, User } from '../lib/supabase';
import { Icons } from '../components/Icons';

interface UserWithStats extends User {
  orders_count?: number;
  total_spent?: number;
}

export default function Users() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [userOrders, setUserOrders] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      // First, get all seller user_ids to exclude them
      const { data: sellers } = await supabase
        .from('sellers')
        .select('user_id');

      const sellerUserIds = sellers?.map(s => s.user_id) || [];

      // Fetch profiles excluding sellers
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // Exclude sellers from the list
      if (sellerUserIds.length > 0) {
        query = query.not('id', 'in', `(${sellerUserIds.join(',')})`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch order stats for each user
      const usersWithStats = await Promise.all(
        (data || []).map(async (user) => {
          const { data: orderData } = await supabase
            .from('orders')
            .select('total_amount')
            .eq('user_id', user.id);

          return {
            ...user,
            orders_count: orderData?.length || 0,
            total_spent: orderData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0,
          };
        })
      );

      setUsers(usersWithStats);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleUserStatus(user: User) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;
      fetchUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Error updating user status');
    }
  }

  async function viewUserDetails(user: UserWithStats) {
    setSelectedUser(user);

    // Fetch user's orders
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    setUserOrders(orders || []);
    setShowModal(true);
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

  function getInitials(name: string) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);
    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <header className="page-header">
        <h1>Customers</h1>
        <p>Manage customer accounts (sellers are listed separately)</p>
      </header>

      <div className="page-content">
        <div className="filter-bar">
          <div className="search-box">
            <span><Icons.Search /></span>
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Customers</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h2>All Customers ({filteredUsers.length})</h2>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="product-info">
                        {user.profile_image_url ? (
                          <img
                            src={user.profile_image_url}
                            alt={user.name}
                            className="product-image"
                            style={{ borderRadius: '50%' }}
                          />
                        ) : (
                          <div className="user-avatar">
                            {getInitials(user.name || 'U')}
                          </div>
                        )}
                        <div className="product-details">
                          <h4>{user.name || 'Unknown'}</h4>
                          <span>ID: {user.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.phone || '-'}</td>
                    <td>{user.orders_count} orders</td>
                    <td>{formatCurrency(user.total_spent || 0)}</td>
                    <td>{formatDate(user.created_at)}</td>
                    <td>
                      <span
                        className={`badge ${user.is_active ? 'success' : 'neutral'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleUserStatus(user)}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="action-btn"
                          onClick={() => viewUserDetails(user)}
                          title="View Details"
                        >
                          <Icons.View />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="icon"><Icons.Users /></div>
                        <p>No users found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Details</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {/* User Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
                {selectedUser.profile_image_url ? (
                  <img
                    src={selectedUser.profile_image_url}
                    alt={selectedUser.name}
                    style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    className="user-avatar"
                    style={{ width: '80px', height: '80px', fontSize: '28px' }}
                  >
                    {getInitials(selectedUser.name || 'U')}
                  </div>
                )}
                <div>
                  <h3>{selectedUser.name}</h3>
                  <p style={{ color: 'var(--text-muted)' }}>{selectedUser.email}</p>
                  <p style={{ color: 'var(--text-muted)' }}>{selectedUser.phone || 'No phone'}</p>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <h4 style={{ fontSize: '24px', marginBottom: '4px' }}>{selectedUser.orders_count}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Total Orders</p>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <h4 style={{ fontSize: '24px', marginBottom: '4px' }}>{formatCurrency(selectedUser.total_spent || 0)}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Total Spent</p>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                  <h4 style={{ fontSize: '24px', marginBottom: '4px' }}>{formatDate(selectedUser.created_at)}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Member Since</p>
                </div>
              </div>

              {/* Recent Orders */}
              <div>
                <h4 style={{ marginBottom: '12px' }}>Recent Orders</h4>
                {userOrders.length > 0 ? (
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
                      {userOrders.map((order) => (
                        <tr key={order.id}>
                          <td>{order.order_number}</td>
                          <td>{formatDate(order.created_at)}</td>
                          <td>{formatCurrency(order.total_amount)}</td>
                          <td>
                            <span className={`badge ${order.order_status === 'delivered' ? 'success' : order.order_status === 'cancelled' ? 'danger' : 'info'}`}>
                              {order.order_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No orders yet</p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className={`btn ${selectedUser.is_active ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => {
                  toggleUserStatus(selectedUser);
                  setSelectedUser({ ...selectedUser, is_active: !selectedUser.is_active });
                }}
              >
                {selectedUser.is_active ? 'Deactivate User' : 'Activate User'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
