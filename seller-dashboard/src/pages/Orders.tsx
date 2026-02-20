import { useEffect, useState } from 'react';
import { SellerUser, supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';

interface OrdersProps {
    seller: SellerUser;
}

interface SellerOrderItem {
    id: string;
    order_id: string;
    product_id: string | null;
    product_name: string;
    product_brand: string | null;
    product_image: string | null;
    size_label: string | null;
    color_name: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    created_at: string;
}

interface SellerOrder {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    delivery_name: string;
    delivery_city: string;
    delivery_state: string;
    created_at: string;
    items: SellerOrderItem[];
    sellerTotal: number;
}

export default function Orders({ seller }: OrdersProps) {
    const [orders, setOrders] = useState<SellerOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);

    useEffect(() => {
        if (seller.seller?.id) {
            fetchOrders();
        }
    }, [seller.seller?.id]);

    async function fetchOrders() {
        try {
            setLoading(true);
            const sellerId = seller.seller!.id;

            // 1. Get all product IDs for this seller
            const { data: products } = await supabase
                .from('products')
                .select('id')
                .eq('seller_id', sellerId);

            const productIds = products?.map(p => p.id) || [];

            if (productIds.length === 0) {
                setOrders([]);
                return;
            }

            // 2. Fetch order_items for seller's products
            const { data: orderItems, error: oiError } = await supabase
                .from('order_items')
                .select('*')
                .in('product_id', productIds)
                .order('created_at', { ascending: false });

            if (oiError) throw oiError;
            if (!orderItems || orderItems.length === 0) {
                setOrders([]);
                return;
            }

            // 3. Get unique order IDs and fetch order details
            const uniqueOrderIds = [...new Set(orderItems.map(oi => oi.order_id))];

            const { data: ordersData, error: ordersError } = await supabase
                .from('orders')
                .select('id, order_number, status, payment_status, delivery_name, delivery_city, delivery_state, created_at')
                .in('id', uniqueOrderIds)
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            // 4. Group order_items by order_id
            const itemsByOrder = new Map<string, SellerOrderItem[]>();
            for (const oi of orderItems) {
                const items = itemsByOrder.get(oi.order_id) || [];
                items.push(oi);
                itemsByOrder.set(oi.order_id, items);
            }

            // 5. Build enriched orders
            const enrichedOrders: SellerOrder[] = (ordersData || []).map(order => {
                const items = itemsByOrder.get(order.id) || [];
                const sellerTotal = items.reduce((sum, oi) => sum + (oi.total_price || 0), 0);
                return { ...order, items, sellerTotal };
            });

            setOrders(enrichedOrders);
        } catch (error) {
            console.error('Error fetching seller orders:', error);
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

    const filteredOrders = orders.filter(order => {
        const matchesSearch = !searchTerm ||
            order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.delivery_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.items.some(i => i.product_name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = !statusFilter || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // Summary stats
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.sellerTotal, 0);
    const totalItems = filteredOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);

    return (
        <div className="orders-page">
            <header className="page-header">
                <div>
                    <h1>My Orders</h1>
                    <p>Orders containing your products</p>
                </div>
            </header>

            {/* Summary Bar */}
            <div className="orders-summary-bar">
                <div className="summary-item">
                    <span className="summary-label">Total Orders</span>
                    <span className="summary-value">{filteredOrders.length}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Total Items Sold</span>
                    <span className="summary-value">{totalItems}</span>
                </div>
                <div className="summary-item">
                    <span className="summary-label">Total Revenue</span>
                    <span className="summary-value revenue">{formatCurrency(totalRevenue)}</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
                <div className="search-input-wrapper">
                    <Icons.Products />
                    <input
                        type="text"
                        placeholder="Search by order ID, customer or product..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {/* Orders List */}
            {loading ? (
                <div className="loading"><div className="spinner"></div></div>
            ) : filteredOrders.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><Icons.Orders /></div>
                    <h3>No orders found</h3>
                    <p>
                        {orders.length === 0
                            ? "You haven't received any orders yet. Once customers purchase your products, they'll appear here."
                            : "No orders match your current filters."
                        }
                    </p>
                </div>
            ) : (
                <div className="seller-orders-list">
                    {filteredOrders.map((order) => (
                        <div
                            key={order.id}
                            className="seller-order-card"
                            onClick={() => setSelectedOrder(order)}
                        >
                            <div className="order-card-header">
                                <div className="order-card-id">
                                    <strong>{order.order_number}</strong>
                                    <span className="order-card-date">{formatDate(order.created_at)}</span>
                                </div>
                                <div className="order-card-badges">
                                    <span className={`order-status-badge ${getStatusClass(order.status)}`}>
                                        {order.status}
                                    </span>
                                    <span className={`payment-badge ${order.payment_status === 'paid' ? 'paid' : 'unpaid'}`}>
                                        {order.payment_status}
                                    </span>
                                </div>
                            </div>

                            <div className="order-card-items">
                                {order.items.map((item) => (
                                    <div key={item.id} className="order-item-row">
                                        <div className="order-item-img">
                                            {item.product_image ? (
                                                <img src={item.product_image} alt={item.product_name} />
                                            ) : (
                                                <div className="order-item-placeholder"><Icons.Products /></div>
                                            )}
                                        </div>
                                        <div className="order-item-details">
                                            <h4>{item.product_name}</h4>
                                            {(item.size_label || item.color_name) && (
                                                <span className="order-item-variant">
                                                    {[item.size_label, item.color_name].filter(Boolean).join(' • ')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="order-item-qty">×{item.quantity}</div>
                                        <div className="order-item-price">{formatCurrency(item.total_price)}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="order-card-footer">
                                <span className="order-customer">
                                    <Icons.Dashboard /> {order.delivery_name} • {order.delivery_city}
                                </span>
                                <span className="order-total">
                                    Your Earnings: <strong>{formatCurrency(order.sellerTotal)}</strong>
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Order {selectedOrder.order_number}</h2>
                            <button className="close-btn" onClick={() => setSelectedOrder(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            {/* Order Info */}
                            <div className="detail-grid">
                                <div className="detail-item">
                                    <label>Customer</label>
                                    <p>{selectedOrder.delivery_name}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Location</label>
                                    <p>{selectedOrder.delivery_city}, {selectedOrder.delivery_state}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Order Date</label>
                                    <p>{formatDate(selectedOrder.created_at)}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Status</label>
                                    <span className={`order-status-badge ${getStatusClass(selectedOrder.status)}`}>
                                        {selectedOrder.status}
                                    </span>
                                </div>
                            </div>

                            {/* Items */}
                            <h3 style={{ margin: '24px 0 12px', fontSize: '16px', color: 'var(--text-secondary)' }}>
                                Your Products in This Order
                            </h3>
                            <table className="order-detail-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Variant</th>
                                        <th>Qty</th>
                                        <th>Unit Price</th>
                                        <th>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedOrder.items.map(item => (
                                        <tr key={item.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    {item.product_image && (
                                                        <img
                                                            src={item.product_image}
                                                            alt=""
                                                            style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
                                                        />
                                                    )}
                                                    {item.product_name}
                                                </div>
                                            </td>
                                            <td>{[item.size_label, item.color_name].filter(Boolean).join(' / ') || '—'}</td>
                                            <td>{item.quantity}</td>
                                            <td>{formatCurrency(item.unit_price)}</td>
                                            <td><strong>{formatCurrency(item.total_price)}</strong></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Total */}
                            <div className="order-detail-total">
                                <span>Your Earnings from This Order</span>
                                <strong>{formatCurrency(selectedOrder.sellerTotal)}</strong>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
