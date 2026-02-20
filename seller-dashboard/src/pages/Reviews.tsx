import { useState, useEffect } from 'react';
import { supabase, SellerUser } from '../lib/supabase';
import { Icons, Icon } from '../components/Icons';

interface Review {
    id: string;
    product_id: string;
    user_id: string;
    rating: number;
    comment: string | null;
    user_name: string | null;
    images: string[] | null;
    seller_reply: string | null;
    created_at: string;
    products: {
        name: string;
        image_url: string | null;
        seller_id: string;
    };
}

export default function Reviews({ seller }: { seller: SellerUser }) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [replyLoading, setReplyLoading] = useState(false);

    useEffect(() => {
        fetchReviews();
    }, []);

    async function fetchReviews() {
        try {
            setLoading(true);
            setError('');
            const { data, error: fetchError } = await supabase
                .from('reviews')
                .select('*, products!inner(name, image_url, seller_id)')
                .eq('products.seller_id', seller.seller?.id)
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setReviews((data as unknown as Review[]) || []);
        } catch (err: any) {
            console.error('Error fetching reviews:', err);
            setError(err.message || 'Failed to fetch reviews');
        } finally {
            setLoading(false);
        }
    }

    async function handleReply(reviewId: string) {
        if (!replyText.trim()) return;

        try {
            setReplyLoading(true);
            const { error: updateError } = await supabase
                .from('reviews')
                .update({ seller_reply: replyText.trim() })
                .eq('id', reviewId);

            if (updateError) throw updateError;

            setReviews(prev =>
                prev.map(r => r.id === reviewId ? { ...r, seller_reply: replyText.trim() } : r)
            );
            setReplyingTo(null);
            setReplyText('');
        } catch (err: any) {
            alert('Failed to submit reply: ' + (err.message || 'Unknown error'));
        } finally {
            setReplyLoading(false);
        }
    }

    function renderStars(rating: number) {
        return (
            <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                    <span
                        key={star}
                        className={`star ${star <= rating ? 'star-filled' : 'star-empty'}`}
                    >
                        <Icon name="StarIcon" size={18} />
                    </span>
                ))}
                <span className="rating-value">{rating}.0</span>
            </div>
        );
    }

    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }

    // Calculate average rating
    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : '0.0';

    return (
        <div className="reviews-page">
            <div className="page-header">
                <div>
                    <h1><Icons.StarIcon /> Review Management</h1>
                    <p>View and respond to customer reviews</p>
                </div>
                <button className="btn btn-secondary" onClick={fetchReviews}>
                    Refresh
                </button>
            </div>

            {/* Stats Bar */}
            {reviews.length > 0 && (
                <div className="reviews-stats">
                    <div className="review-stat-card">
                        <span className="review-stat-value">{reviews.length}</span>
                        <span className="review-stat-label">Total Reviews</span>
                    </div>
                    <div className="review-stat-card">
                        <span className="review-stat-value">{avgRating}</span>
                        <span className="review-stat-label">Avg. Rating</span>
                    </div>
                    <div className="review-stat-card">
                        <span className="review-stat-value">
                            {reviews.filter(r => r.rating >= 4).length}
                        </span>
                        <span className="review-stat-label">Positive (4★+)</span>
                    </div>
                    <div className="review-stat-card">
                        <span className="review-stat-value">
                            {reviews.filter(r => !r.seller_reply).length}
                        </span>
                        <span className="review-stat-label">Awaiting Reply</span>
                    </div>
                </div>
            )}

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading reviews...</p>
                </div>
            ) : reviews.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <Icons.StarIcon />
                    </div>
                    <h3>No Reviews Yet</h3>
                    <p>Customer reviews for your products will appear here.</p>
                </div>
            ) : (
                <div className="reviews-list">
                    {reviews.map((review) => (
                        <div className="card review-card" key={review.id}>
                            <div className="review-card-header">
                                <div className="review-product-info">
                                    {review.products?.image_url ? (
                                        <img
                                            src={review.products.image_url}
                                            alt={review.products.name}
                                            className="review-product-image"
                                        />
                                    ) : (
                                        <div className="review-product-image review-no-image">
                                            <Icons.Products />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="review-product-name">
                                            {review.products?.name || 'Unknown Product'}
                                        </h3>
                                        <span className="review-date">
                                            {formatDate(review.created_at)}
                                        </span>
                                    </div>
                                </div>
                                {renderStars(review.rating)}
                            </div>

                            <div className="review-card-body">
                                <div className="review-author">
                                    <div className="review-avatar">
                                        {(review.user_name || 'U')[0].toUpperCase()}
                                    </div>
                                    <span className="review-user-name">
                                        {review.user_name || 'Anonymous User'}
                                    </span>
                                </div>

                                {review.comment && (
                                    <p className="review-comment">{review.comment}</p>
                                )}

                                {review.images && review.images.length > 0 && (
                                    <div className="review-images">
                                        {review.images.map((img, idx) => (
                                            <img
                                                key={idx}
                                                src={img}
                                                alt={`Review image ${idx + 1}`}
                                                className="review-image-thumb"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="review-card-footer">
                                {review.seller_reply ? (
                                    <div className="seller-reply">
                                        <div className="seller-reply-header">
                                            <Icons.Store />
                                            <strong>Your Reply</strong>
                                        </div>
                                        <p className="seller-reply-text">{review.seller_reply}</p>
                                    </div>
                                ) : replyingTo === review.id ? (
                                    <div className="reply-form">
                                        <textarea
                                            className="reply-textarea"
                                            placeholder="Write your reply to this review..."
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            rows={3}
                                            autoFocus
                                        />
                                        <div className="reply-actions">
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => {
                                                    setReplyingTo(null);
                                                    setReplyText('');
                                                }}
                                                disabled={replyLoading}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleReply(review.id)}
                                                disabled={replyLoading || !replyText.trim()}
                                            >
                                                {replyLoading ? 'Sending...' : 'Submit Reply'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        className="btn btn-reply"
                                        onClick={() => setReplyingTo(review.id)}
                                    >
                                        Reply to Review
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
