import { useState, useEffect } from 'react';
import { supabase, SellerUser } from '../lib/supabase';
import { Icons } from '../components/Icons';

interface ReturnItem {
    id: string;
    order_id: string;
    reason: string;
    status: string;
    created_at: string;
    order_items: {
        product_id: string;
        products: {
            name: string;
            seller_id: string;
        };
    };
}

export default function Returns({ seller }: { seller: SellerUser }) {
    const [returns, setReturns] = useState<ReturnItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchReturns();
    }, []);

    async function fetchReturns() {
        try {
            setLoading(true);
            setError('');
            const { data, error: fetchError } = await supabase
                .from('returns')
                .select('*, order_items!inner(product_id, products!inner(seller_id, name))')
                .eq('order_items.products.seller_id', seller.seller?.id)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setReturns((data as unknown as ReturnItem[]) || []);
        } catch (err: any) {
            console.error('Error fetching returns:', err);
            setError(err.message || 'Failed to fetch returns');
        } finally {
            setLoading(false);
        }
    }

    async function handleApprove(returnId: string) {
        try {
            setActionLoading(returnId);
            const { error: updateError } = await supabase
                .from('returns')
                .update({ status: 'approved' })
                .eq('id', returnId);

            if (updateError) throw updateError;

            setReturns(prev =>
                prev.map(r => r.id === returnId ? { ...r, status: 'approved' } : r)
            );
        } catch (err: any) {
            alert('Failed to approve return: ' + (err.message || 'Unknown error'));
        } finally {
            setActionLoading(null);
        }
    }

    async function handleReject(returnId: string) {
        const rejectReason = window.prompt('Enter reason for rejection:');
        if (!rejectReason) return; // User cancelled

        try {
            setActionLoading(returnId);
            const { error: updateError } = await supabase
                .from('returns')
                .update({ status: 'rejected', rejection_reason: rejectReason })
                .eq('id', returnId);

            if (updateError) throw updateError;

            setReturns(prev =>
                prev.map(r => r.id === returnId ? { ...r, status: 'rejected' } : r)
            );
        } catch (err: any) {
            alert('Failed to reject return: ' + (err.message || 'Unknown error'));
        } finally {
            setActionLoading(null);
        }
    }

    function getStatusClass(status: string) {
        switch (status) {
            case 'approved': return 'status-approved';
            case 'rejected': return 'status-rejected';
            case 'pending': return 'status-pending';
            default: return 'status-default';
        }
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }

    return (
        <div className="returns-page">
            <div className="page-header">
                <div>
                    <h1><Icons.ReturnIcon /> Returns Management</h1>
                    <p>Manage product return requests from customers</p>
                </div>
                <button className="btn btn-secondary" onClick={fetchReturns}>
                    Refresh
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading returns...</p>
                </div>
            ) : returns.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <Icons.ReturnIcon />
                    </div>
                    <h3>No Returns Yet</h3>
                    <p>Return requests from customers will appear here.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Order ID</th>
                                <th>Product</th>
                                <th>Reason</th>
                                <th>Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {returns.map((item) => (
                                <tr key={item.id}>
                                    <td className="order-id-cell">
                                        <code>{item.order_id?.substring(0, 8)}...</code>
                                    </td>
                                    <td className="product-name-cell">
                                        {item.order_items?.products?.name || 'Unknown Product'}
                                    </td>
                                    <td className="reason-cell">
                                        {item.reason || '—'}
                                    </td>
                                    <td className="date-cell">
                                        {formatDate(item.created_at)}
                                    </td>
                                    <td>
                                        <span className={`return-status ${getStatusClass(item.status)}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td className="actions-cell">
                                        {item.status === 'pending' ? (
                                            <div className="action-buttons">
                                                <button
                                                    className="btn btn-approve"
                                                    onClick={() => handleApprove(item.id)}
                                                    disabled={actionLoading === item.id}
                                                >
                                                    <Icons.Check /> Approve
                                                </button>
                                                <button
                                                    className="btn btn-reject"
                                                    onClick={() => handleReject(item.id)}
                                                    disabled={actionLoading === item.id}
                                                >
                                                    ✕ Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="action-resolved">Resolved</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
