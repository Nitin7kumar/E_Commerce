import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { format } from 'date-fns';

// =====================================================
// TYPES
// =====================================================

interface Coupon {
  id: string;
  code: string;
  name: string;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  min_order_value: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  valid_until: string | null;
  created_at: string;
}

interface CouponFormData {
  code: string;
  discount_type: 'fixed' | 'percent';
  discount_value: string;
  min_order_value: string;
  max_uses: string;
  valid_until: string;
}

const INITIAL_FORM: CouponFormData = {
  code: '',
  discount_type: 'percent',
  discount_value: '',
  min_order_value: '',
  max_uses: '',
  valid_until: '',
};

// =====================================================
// COMPONENT
// =====================================================

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<CouponFormData>(INITIAL_FORM);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchCoupons();
  }, []);

  // =====================================================
  // DATA FETCHING
  // =====================================================

  async function fetchCoupons() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (err) {
      console.error('Error fetching coupons:', err);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // CREATE COUPON
  // =====================================================

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!form.code.trim()) {
      setError('Coupon code is required');
      return;
    }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      setError('Discount value must be greater than 0');
      return;
    }
    if (form.discount_type === 'percent' && parseFloat(form.discount_value) > 100) {
      setError('Percentage discount cannot exceed 100%');
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        name: form.code.trim().toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until || null,
        is_active: true,
        current_uses: 0,
      };

      const { error: insertError } = await supabase
        .from('coupons')
        .insert([payload]);

      if (insertError) throw insertError;

      setSuccess(`Coupon "${payload.code}" created successfully!`);
      setForm(INITIAL_FORM);
      fetchCoupons();
    } catch (err: any) {
      console.error('Error creating coupon:', err);
      if (err?.code === '23505') {
        setError('A coupon with this code already exists');
      } else {
        setError(err?.message || 'Failed to create coupon');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // =====================================================
  // DEACTIVATE COUPON (soft-delete)
  // =====================================================

  async function deactivateCoupon(id: string) {
    if (!confirm('Deactivate this coupon? It will no longer be usable by customers.')) return;

    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      fetchCoupons();
    } catch (err) {
      console.error('Error deactivating coupon:', err);
      alert('Failed to deactivate coupon');
    }
  }

  // =====================================================
  // REACTIVATE COUPON
  // =====================================================

  async function reactivateCoupon(id: string) {
    try {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;
      fetchCoupons();
    } catch (err) {
      console.error('Error reactivating coupon:', err);
      alert('Failed to reactivate coupon');
    }
  }

  // =====================================================
  // HELPERS
  // =====================================================

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatDate(dateStr: string) {
    return format(new Date(dateStr), 'dd MMM yyyy');
  }

  function isExpired(validUntil: string | null): boolean {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  }

  const filteredCoupons = coupons.filter((c) =>
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCoupons = filteredCoupons.filter((c) => c.is_active);
  const inactiveCoupons = filteredCoupons.filter((c) => !c.is_active);

  // =====================================================
  // STATS
  // =====================================================

  const stats = {
    total: coupons.length,
    active: coupons.filter((c) => c.is_active && !isExpired(c.valid_until)).length,
    expired: coupons.filter((c) => isExpired(c.valid_until)).length,
    totalUsage: coupons.reduce((sum, c) => sum + (c.current_uses || 0), 0),
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <>
      <header className="page-header">
        <h1>Coupons</h1>
        <p>Create and manage discount coupons for your store</p>
      </header>

      <div className="page-content">
        {/* Stats Row */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon purple">
              <Icons.Ticket />
            </div>
            <div className="stat-content">
              <h3>{stats.total}</h3>
              <p>Total Coupons</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <Icons.Check />
            </div>
            <div className="stat-content">
              <h3>{stats.active}</h3>
              <p>Active Coupons</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">
              <Icons.Pending />
            </div>
            <div className="stat-content">
              <h3>{stats.expired}</h3>
              <p>Expired</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon blue">
              <Icons.Analytics />
            </div>
            <div className="stat-content">
              <h3>{stats.totalUsage}</h3>
              <p>Total Redemptions</p>
            </div>
          </div>
        </div>

        {/* Split Layout: Form + Table */}
        <div className="coupon-layout">
          {/* Left: Create Coupon Form */}
          <div className="coupon-form-card">
            <div className="table-header">
              <h2>Create Coupon</h2>
            </div>

            <form onSubmit={createCoupon} style={{ padding: '24px' }}>
              {error && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#fca5a5',
                    fontSize: '14px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Icons.Warning />
                  {error}
                </div>
              )}

              {success && (
                <div
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    color: '#6ee7b7',
                    fontSize: '14px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Icons.Check />
                  {success}
                </div>
              )}

              <div className="form-group">
                <label>Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. SAVE20"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Discount Type</label>
                  <select
                    value={form.discount_type}
                    onChange={(e) =>
                      setForm({ ...form, discount_type: e.target.value as 'fixed' | 'percent' })
                    }
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount (₹)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    Discount Value {form.discount_type === 'percent' ? '(%)' : '(₹)'}
                  </label>
                  <input
                    type="number"
                    placeholder={form.discount_type === 'percent' ? 'e.g. 20' : 'e.g. 500'}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    min="0"
                    max={form.discount_type === 'percent' ? '100' : undefined}
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label>Min Order Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 999"
                    value={form.min_order_value}
                    onChange={(e) => setForm({ ...form, min_order_value: e.target.value })}
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Max Uses (optional)</label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    value={form.max_uses}
                    onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                    min="1"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Expiry Date (optional)</label>
                <input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ width: '100%', justifyContent: 'center', marginTop: '8px' }}
              >
                {submitting ? (
                  <>
                    <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
                    Creating...
                  </>
                ) : (
                  <>
                    <Icons.Add />
                    Create Coupon
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right: Coupons Table */}
          <div className="coupon-table-card">
            <div className="table-header">
              <h2>All Coupons ({filteredCoupons.length})</h2>
              <div className="search-box" style={{ minWidth: '220px' }}>
                <span><Icons.Search /></span>
                <input
                  type="text"
                  placeholder="Search by code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="loading">
                <div className="spinner" />
              </div>
            ) : filteredCoupons.length === 0 ? (
              <div className="empty-state">
                <div className="icon"><Icons.Ticket /></div>
                <p>No coupons found</p>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>Create your first coupon using the form</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Discount</th>
                      <th>Min Order</th>
                      <th>Usage</th>
                      <th>Expires</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Active coupons first */}
                    {activeCoupons.map((coupon) => (
                      <tr key={coupon.id}>
                        <td>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '14px',
                              fontWeight: 700,
                              letterSpacing: '1px',
                              padding: '4px 10px',
                              background: 'rgba(99, 102, 241, 0.15)',
                              borderRadius: '6px',
                              color: 'var(--primary-light)',
                            }}
                          >
                            {coupon.code}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {coupon.discount_type === 'percent'
                            ? `${coupon.discount_value}%`
                            : formatCurrency(coupon.discount_value)}
                        </td>
                        <td>{coupon.min_order_value > 0 ? formatCurrency(coupon.min_order_value) : '—'}</td>
                        <td>
                          {coupon.current_uses || 0}
                          {coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                        </td>
                        <td>
                          {coupon.valid_until ? (
                            <span style={{ color: isExpired(coupon.valid_until) ? 'var(--danger)' : 'var(--text-secondary)' }}>
                              {formatDate(coupon.valid_until)}
                              {isExpired(coupon.valid_until) && ' (expired)'}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Never</span>
                          )}
                        </td>
                        <td>
                          {isExpired(coupon.valid_until) ? (
                            <span className="badge warning">Expired</span>
                          ) : (
                            <span className="badge success">Active</span>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{formatDate(coupon.created_at)}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="action-btn delete"
                              onClick={() => deactivateCoupon(coupon.id)}
                              title="Deactivate Coupon"
                            >
                              <Icons.Close />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* Inactive coupons */}
                    {inactiveCoupons.map((coupon) => (
                      <tr key={coupon.id} style={{ opacity: 0.5 }}>
                        <td>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '14px',
                              fontWeight: 700,
                              letterSpacing: '1px',
                              padding: '4px 10px',
                              background: 'rgba(148, 163, 184, 0.1)',
                              borderRadius: '6px',
                              color: 'var(--text-muted)',
                              textDecoration: 'line-through',
                            }}
                          >
                            {coupon.code}
                          </span>
                        </td>
                        <td>
                          {coupon.discount_type === 'percent'
                            ? `${coupon.discount_value}%`
                            : formatCurrency(coupon.discount_value)}
                        </td>
                        <td>{coupon.min_order_value > 0 ? formatCurrency(coupon.min_order_value) : '—'}</td>
                        <td>{coupon.current_uses || 0}{coupon.max_uses ? ` / ${coupon.max_uses}` : ''}</td>
                        <td>{coupon.valid_until ? formatDate(coupon.valid_until) : '—'}</td>
                        <td><span className="badge neutral">Inactive</span></td>
                        <td style={{ color: 'var(--text-muted)' }}>{formatDate(coupon.created_at)}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="action-btn"
                              onClick={() => reactivateCoupon(coupon.id)}
                              title="Reactivate Coupon"
                              style={{ color: 'var(--secondary)' }}
                            >
                              <Icons.Check />
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
      </div>
    </>
  );
}
