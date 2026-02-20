import { useEffect, useState } from 'react';
import { supabase, Order, OrderItem } from '../lib/supabase';
import { Icons } from '../components/Icons';

interface OrderWithItems extends Order {
  order_items?: OrderItem[];
  profile?: { name: string; email: string };
}

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

export default function Orders() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      // Debug: log current user
      const { data: { user } } = await supabase.auth.getUser();
      console.log('[Orders] Current user:', user?.email, 'ID:', user?.id);

      // Simple count to check RLS access
      const { count, error: countErr } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });
      console.log('[Orders] Row count:', count, 'countError:', countErr);

      // Fetch orders with order_items
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .order('created_at', { ascending: false });

      console.log('[Orders] Fetched:', ordersData?.length ?? 0, 'rows, error:', ordersError);

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Batch-fetch profiles for all unique user_ids
      const userIds = [...new Set(ordersData.map((o) => o.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);

      // Build a lookup map
      const profileMap = new Map<string, { name: string; email: string }>();
      if (profilesData) {
        for (const p of profilesData) {
          profileMap.set(p.id, { name: p.name, email: p.email });
        }
      }

      // Merge profile data into each order
      const enrichedOrders: OrderWithItems[] = ordersData.map((order) => ({
        ...order,
        profile: profileMap.get(order.user_id) || undefined,
      }));

      setOrders(enrichedOrders);
    } catch (error) {
      console.error('[Orders] Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: string) {
    try {
      const updates: Record<string, any> = { status: newStatus };
      if (newStatus === 'delivered') {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Error updating order status');
    }
  }

  async function updatePaymentStatus(orderId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: newStatus })
        .eq('id', orderId);

      if (error) throw error;
      fetchOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, payment_status: newStatus });
      }
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Error updating payment status');
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
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getStatusBadge(status: string) {
    const statusMap: Record<string, string> = {
      pending: 'warning',
      confirmed: 'info',
      processing: 'info',
      shipped: 'info',
      delivered: 'success',
      cancelled: 'danger',
      paid: 'success',
      failed: 'danger',
      refunded: 'neutral',
    };
    return statusMap[status] || 'neutral';
  }

  function openOrderDetails(order: OrderWithItems) {
    setSelectedOrder(order);
    setShowModal(true);
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.profile as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.delivery_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <header className="page-header">
        <h1>Orders</h1>
        <p>Manage customer orders</p>
      </header>

      <div className="page-content">
        <div className="filter-bar">
          <div className="search-box">
            <span><Icons.Search /></span>
            <input
              type="text"
              placeholder="Search by order ID or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h2>All Orders ({filteredOrders.length})</h2>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.order_number}</strong>
                    </td>
                    <td>
                      <div>
                        <div>{order.delivery_name || (order.profile as any)?.name || 'Unknown'}</div>
                        <small style={{ color: 'var(--text-muted)' }}>
                          {(order.profile as any)?.email}
                        </small>
                      </div>
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{order.order_items?.length || 0} items</td>
                    <td>
                      <strong>{formatCurrency(order.total_amount)}</strong>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(order.payment_status)}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td>
                      <select
                        className="filter-select"
                        style={{ minWidth: '120px', padding: '6px 10px' }}
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      >
                        {ORDER_STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="action-btn"
                          onClick={() => openOrderDetails(order)}
                          title="View Details"
                        >
                          <Icons.View />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="icon"><Icons.Orders /></div>
                        <p>No orders found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details - {selectedOrder.order_number}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              {/* Order Info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                <div>
                  <h4 style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>Customer Information</h4>
                  <p><strong>{selectedOrder.delivery_name}</strong></p>
                  <p>{selectedOrder.delivery_phone}</p>
                  <p>{(selectedOrder.profile as any)?.email}</p>
                </div>
                <div>
                  <h4 style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>Shipping Address</h4>
                  <p>{selectedOrder.delivery_address}</p>
                  <p>{selectedOrder.delivery_city}, {selectedOrder.delivery_state}</p>
                  <p>{selectedOrder.delivery_pincode}</p>
                </div>
              </div>

              {/* Order Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <div className="form-group">
                  <label>Order Status</label>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={selectedOrder.status}
                    onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Payment Status</label>
                  <select
                    className="filter-select"
                    style={{ width: '100%' }}
                    value={selectedOrder.payment_status}
                    onChange={(e) => updatePaymentStatus(selectedOrder.id, e.target.value)}
                  >
                    {PAYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>Order Items</h4>
                <table style={{ marginBottom: '24px' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.order_items?.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div>
                            <strong>{item.product_name}</strong>
                            {(item.size_label || item.color_name) && (
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {[item.size_label, item.color_name].filter(Boolean).join(' / ')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td>{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order Summary */}
              <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Discount</span>
                  <span style={{ color: 'var(--secondary)' }}>-{formatCurrency(selectedOrder.discount_amount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span>Delivery Charge</span>
                  <span>{formatCurrency(selectedOrder.delivery_charge)}</span>
                </div>
                <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '12px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '600' }}>
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
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
