import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { format } from 'date-fns';

// =====================================================
// TYPES
// =====================================================

interface Review {
    id: string;
    user_id: string;
    product_id: string;
    order_id: string | null;
    rating: number;
    comment: string | null;
    images: string[] | null;
    is_verified_purchase: boolean;
    created_at: string;
    // Joined data
    user?: { full_name: string; email: string } | null;
    product?: { name: string; image_url: string | null } | null;
}

type FilterTab = 'low' | 'all' | 'high';

// =====================================================
// COMPONENT
// =====================================================

export default function Reviews() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<FilterTab>('low');
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchReviews();
    }, []);

    // =====================================================
    // DATA FETCHING
    // =====================================================

    async function fetchReviews() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('reviews')
                .select(`
          *,
          user:profiles!reviews_user_id_fkey(full_name, email),
          product:products!reviews_product_id_fkey(name, image_url)
        `)
                .order('created_at', { ascending: false });

            if (error) {
                // Fallback: fetch without joins if FK names differ
                console.warn('Join query failed, trying simple fetch:', error.message);
                const { data: simpleData, error: simpleError } = await supabase
                    .from('reviews')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (simpleError) throw simpleError;
                setReviews(simpleData || []);
                return;
            }

            setReviews(data || []);
        } catch (err) {
            console.error('Error fetching reviews:', err);
        } finally {
            setLoading(false);
        }
    }

    // =====================================================
    // DELETE REVIEW
    // =====================================================

    async function deleteReview(id: string) {
        if (!confirm('Delete this review permanently? This action cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('reviews')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setReviews(reviews.filter((r) => r.id !== id));
            if (selectedReview?.id === id) {
                setShowModal(false);
                setSelectedReview(null);
            }
        } catch (err) {
            console.error('Error deleting review:', err);
            alert('Failed to delete review');
        }
    }

    // =====================================================
    // HELPERS
    // =====================================================

    function formatDate(dateStr: string) {
        return format(new Date(dateStr), 'dd MMM yyyy, HH:mm');
    }

    function renderStars(rating: number) {
        return (
            <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        style={{
                            color: star <= rating ? '#f59e0b' : 'var(--bg-tertiary)',
                            fontSize: '16px',
                            lineHeight: 1,
                        }}
                    >
                        ★
                    </span>
                ))}
                <span style={{ marginLeft: '6px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    {rating}.0
                </span>
            </div>
        );
    }

    function getRatingBadge(rating: number) {
        if (rating >= 4) return 'success';
        if (rating === 3) return 'warning';
        return 'danger';
    }

    function getUserName(review: Review): string {
        if (review.user && typeof review.user === 'object') {
            return (review.user as any).full_name || (review.user as any).email || 'Unknown User';
        }
        return review.user_id?.slice(0, 8) + '...' || 'Unknown';
    }

    function getProductName(review: Review): string {
        if (review.product && typeof review.product === 'object') {
            return (review.product as any).name || 'Unknown Product';
        }
        return review.product_id?.slice(0, 8) + '...' || 'Unknown';
    }

    function getProductImage(review: Review): string | null {
        if (review.product && typeof review.product === 'object') {
            return (review.product as any).image_url || null;
        }
        return null;
    }

    // =====================================================
    // FILTERING
    // =====================================================

    const filtered = reviews.filter((r) => {
        const matchesSearch =
            getUserName(r).toLowerCase().includes(searchTerm.toLowerCase()) ||
            getProductName(r).toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.comment || '').toLowerCase().includes(searchTerm.toLowerCase());

        if (activeTab === 'low') return matchesSearch && r.rating < 3;
        if (activeTab === 'high') return matchesSearch && r.rating >= 4;
        return matchesSearch;
    });

    // =====================================================
    // STATS
    // =====================================================

    const stats = {
        total: reviews.length,
        avgRating: reviews.length > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
            : '0.0',
        lowRating: reviews.filter((r) => r.rating < 3).length,
        highRating: reviews.filter((r) => r.rating >= 4).length,
    };

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <>
            <header className="page-header">
                <h1>Review Moderation</h1>
                <p>Monitor, review, and moderate customer feedback</p>
            </header>

            <div className="page-content">
                {/* Stats Row */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon purple">
                            <Icons.Shield />
                        </div>
                        <div className="stat-content">
                            <h3>{stats.total}</h3>
                            <p>Total Reviews</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon blue">
                            <Icons.Sparkle />
                        </div>
                        <div className="stat-content">
                            <h3>{stats.avgRating}</h3>
                            <p>Average Rating</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon red">
                            <Icons.Warning />
                        </div>
                        <div className="stat-content">
                            <h3>{stats.lowRating}</h3>
                            <p>Low Ratings (&lt;3★)</p>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon green">
                            <Icons.Check />
                        </div>
                        <div className="stat-content">
                            <h3>{stats.highRating}</h3>
                            <p>Positive (≥4★)</p>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="filter-bar">
                    <div className="search-box">
                        <span><Icons.Search /></span>
                        <input
                            type="text"
                            placeholder="Search by user, product, or comment..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="tabs" style={{ marginBottom: 0 }}>
                        <button
                            className={`tab ${activeTab === 'low' ? 'active' : ''}`}
                            onClick={() => setActiveTab('low')}
                        >
                            ⚠ Low Rating ({stats.lowRating})
                        </button>
                        <button
                            className={`tab ${activeTab === 'all' ? 'active' : ''}`}
                            onClick={() => setActiveTab('all')}
                        >
                            All ({stats.total})
                        </button>
                        <button
                            className={`tab ${activeTab === 'high' ? 'active' : ''}`}
                            onClick={() => setActiveTab('high')}
                        >
                            ★ Positive ({stats.highRating})
                        </button>
                    </div>
                </div>

                {/* Reviews Table */}
                <div className="table-container">
                    <div className="table-header">
                        <h2>
                            {activeTab === 'low' && '⚠ Reviews Needing Attention'}
                            {activeTab === 'all' && 'All Reviews'}
                            {activeTab === 'high' && '★ Positive Reviews'}
                            {' '}({filtered.length})
                        </h2>
                    </div>

                    {loading ? (
                        <div className="loading">
                            <div className="spinner" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="empty-state">
                            <div className="icon"><Icons.Shield /></div>
                            <p>
                                {activeTab === 'low'
                                    ? 'No low-rating reviews found — great!'
                                    : 'No reviews found'}
                            </p>
                            <p style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-muted)' }}>
                                {activeTab === 'low'
                                    ? 'All customer feedback looks positive'
                                    : 'Reviews will appear here once customers submit them'}
                            </p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>User</th>
                                        <th>Rating</th>
                                        <th>Comment</th>
                                        <th>Images</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((review) => (
                                        <tr key={review.id}>
                                            <td>
                                                <div className="product-info">
                                                    {getProductImage(review) ? (
                                                        <img
                                                            src={getProductImage(review)!}
                                                            alt=""
                                                            className="product-image"
                                                        />
                                                    ) : (
                                                        <div
                                                            className="product-image"
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'var(--text-muted)',
                                                                fontSize: '12px',
                                                            }}
                                                        >
                                                            <Icons.Products />
                                                        </div>
                                                    )}
                                                    <div className="product-details">
                                                        <h4>{getProductName(review)}</h4>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{getUserName(review)}</div>
                                                    {review.is_verified_purchase && (
                                                        <span
                                                            style={{
                                                                fontSize: '11px',
                                                                color: 'var(--secondary)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                                marginTop: '2px',
                                                            }}
                                                        >
                                                            <Icons.Check /> Verified Purchase
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${getRatingBadge(review.rating)}`}>
                                                    {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                                </span>
                                            </td>
                                            <td>
                                                <div
                                                    style={{
                                                        maxWidth: '280px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        color: review.comment ? 'var(--text-primary)' : 'var(--text-muted)',
                                                        fontStyle: review.comment ? 'normal' : 'italic',
                                                    }}
                                                    title={review.comment || ''}
                                                >
                                                    {review.comment || 'No comment'}
                                                </div>
                                            </td>
                                            <td>
                                                {review.images && review.images.length > 0 ? (
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        {review.images.slice(0, 3).map((img, i) => (
                                                            <img
                                                                key={i}
                                                                src={img}
                                                                alt=""
                                                                style={{
                                                                    width: '32px',
                                                                    height: '32px',
                                                                    borderRadius: '4px',
                                                                    objectFit: 'cover',
                                                                    border: '1px solid var(--border-color)',
                                                                }}
                                                            />
                                                        ))}
                                                        {review.images.length > 3 && (
                                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                                                                +{review.images.length - 3}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                )}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                                {formatDate(review.created_at)}
                                            </td>
                                            <td>
                                                <div className="row-actions">
                                                    <button
                                                        className="action-btn"
                                                        onClick={() => {
                                                            setSelectedReview(review);
                                                            setShowModal(true);
                                                        }}
                                                        title="View Details"
                                                    >
                                                        <Icons.View />
                                                    </button>
                                                    <button
                                                        className="action-btn delete"
                                                        onClick={() => deleteReview(review.id)}
                                                        title="Delete Review"
                                                    >
                                                        <Icons.Delete />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Review Detail Modal */}
            {showModal && selectedReview && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Review Details</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            {/* Product Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                {getProductImage(selectedReview) ? (
                                    <img
                                        src={getProductImage(selectedReview)!}
                                        alt=""
                                        style={{ width: '64px', height: '64px', borderRadius: '8px', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: '64px',
                                            height: '64px',
                                            borderRadius: '8px',
                                            background: 'var(--bg-tertiary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Icons.Products />
                                    </div>
                                )}
                                <div>
                                    <h3>{getProductName(selectedReview)}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                                        Reviewed by <strong>{getUserName(selectedReview)}</strong>
                                    </p>
                                </div>
                            </div>

                            {/* Rating */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                    Rating
                                </label>
                                {renderStars(selectedReview.rating)}
                            </div>

                            {/* Comment */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                    Comment
                                </label>
                                <div
                                    style={{
                                        padding: '16px',
                                        background: 'var(--bg-tertiary)',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        lineHeight: 1.6,
                                        color: selectedReview.comment ? 'var(--text-primary)' : 'var(--text-muted)',
                                        fontStyle: selectedReview.comment ? 'normal' : 'italic',
                                    }}
                                >
                                    {selectedReview.comment || 'No comment provided'}
                                </div>
                            </div>

                            {/* Images */}
                            {selectedReview.images && selectedReview.images.length > 0 && (
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', display: 'block' }}>
                                        Attached Images ({selectedReview.images.length})
                                    </label>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {selectedReview.images.map((img, i) => (
                                            <img
                                                key={i}
                                                src={img}
                                                alt={`Review image ${i + 1}`}
                                                style={{
                                                    width: '80px',
                                                    height: '80px',
                                                    borderRadius: '8px',
                                                    objectFit: 'cover',
                                                    border: '1px solid var(--border-color)',
                                                    cursor: 'pointer',
                                                }}
                                                onClick={() => window.open(img, '_blank')}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Meta info */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px',
                                    padding: '16px',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                }}
                            >
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>Date:</span>{' '}
                                    {formatDate(selectedReview.created_at)}
                                </div>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>Verified:</span>{' '}
                                    {selectedReview.is_verified_purchase ? (
                                        <span style={{ color: 'var(--secondary)' }}>✓ Yes</span>
                                    ) : (
                                        'No'
                                    )}
                                </div>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>Review ID:</span>{' '}
                                    {selectedReview.id.slice(0, 12)}...
                                </div>
                                <div>
                                    <span style={{ color: 'var(--text-muted)' }}>User ID:</span>{' '}
                                    {selectedReview.user_id.slice(0, 12)}...
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-danger"
                                onClick={() => deleteReview(selectedReview.id)}
                            >
                                <Icons.Delete />
                                Delete Review
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
