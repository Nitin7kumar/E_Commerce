import { useEffect, useState } from 'react';
import { supabase, Seller } from '../lib/supabase';
import { Icons } from '../components/Icons';

// =====================================================
// SELLER MANAGEMENT PAGE (Admin Only)
// =====================================================
// This page allows admin to:
// 1. View all sellers
// 2. Create new sellers (linked to auth users)
// 3. Activate/Deactivate sellers
// 4. Mark sellers as verified
// 5. Edit seller store information
//
// CRITICAL: Sellers CANNOT self-register.
// Admin manually creates seller profiles.
// =====================================================

interface SellerWithProducts extends Seller {
  products_count?: number;
}

export default function Sellers() {
  const [sellers, setSellers] = useState<SellerWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form data matching 007_seller_system.sql schema
  const [formData, setFormData] = useState({
    user_email: '',        // For creating new auth user
    user_password: '',     // For creating new auth user
    store_name: '',
    store_description: '',
    logo_url: '',
    contact_email: '',
    contact_phone: '',
    business_address: '',
    is_active: false,      // Starts inactive by default
    is_verified: false,
  });

  useEffect(() => {
    fetchSellers();
  }, []);

  async function fetchSellers() {
    setLoading(true);
    setError('');
    try {
      // Fetch sellers with product count
      const { data, error } = await supabase
        .from('sellers')
        .select(`
          *,
          products:products(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to include product count
      const sellersWithCount = (data || []).map((seller: any) => ({
        ...seller,
        products_count: seller.products?.[0]?.count || 0,
      }));

      setSellers(sellersWithCount);
    } catch (err: any) {
      console.error('Error fetching sellers:', err);
      setError('Failed to load sellers: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      if (editingSeller) {
        // UPDATE existing seller
        const { error } = await supabase
          .from('sellers')
          .update({
            store_name: formData.store_name,
            store_description: formData.store_description || null,
            logo_url: formData.logo_url || null,
            contact_email: formData.contact_email || null,
            contact_phone: formData.contact_phone || null,
            business_address: formData.business_address || null,
            is_active: formData.is_active,
            is_verified: formData.is_verified,
          })
          .eq('id', editingSeller.id);

        if (error) throw error;
      } else {
        // CREATE new seller
        // Step 1: Validate required fields
        if (!formData.user_email) {
          throw new Error('Email is required to create a seller account');
        }
        if (!formData.store_name) {
          throw new Error('Store name is required');
        }

        let userId: string;

        // Step 2: Try to create new auth user
        if (formData.user_password) {
          // Create a new user with the provided password
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.user_email,
            password: formData.user_password,
            options: {
              data: {
                is_seller: true,
                store_name: formData.store_name,
              }
            }
          });

          if (authError) {
            // Check if user already exists
            if (authError.message.includes('already registered') ||
              authError.message.includes('already exists')) {
              throw new Error(
                `User with email "${formData.user_email}" already exists. ` +
                `If you want to make this existing user a seller, use "Link Existing User" option or leave password empty.`
              );
            }
            throw authError;
          }

          if (!authData.user) {
            throw new Error('Failed to create user account');
          }

          userId = authData.user.id;
        } else {
          // No password provided - try to find existing user by email
          // This requires admin access, so we'll prompt for user_id instead
          throw new Error(
            'Password is required to create a new seller account. ' +
            'If linking an existing user, please provide their User ID in the password field prefixed with "uid:"'
          );
        }

        // Step 3: Check if this user already has a seller profile
        const { data: existingSeller } = await supabase
          .from('sellers')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (existingSeller) {
          throw new Error('This user already has a seller profile');
        }

        // Step 4: Create seller record linked to the auth user
        console.log('=== SELLER INSERT START ===');
        console.log('User ID:', userId);
        console.log('Store Name:', formData.store_name);
        console.log('Contact Email:', formData.contact_email || formData.user_email);

        const insertPayload = {
          user_id: userId,
          store_name: formData.store_name,
          store_description: formData.store_description || null,
          logo_url: formData.logo_url || null,
          contact_email: formData.contact_email || formData.user_email,
          contact_phone: formData.contact_phone || null,
          business_address: formData.business_address || null,
          is_active: formData.is_active,
          is_verified: formData.is_verified,
        };

        console.log('Insert payload:', JSON.stringify(insertPayload, null, 2));

        const { data: newSeller, error: sellerError } = await supabase
          .from('sellers')
          .insert([insertPayload])
          .select();

        console.log('=== SELLER INSERT RESULT ===');
        console.log('New Seller Data:', newSeller);
        console.log('Seller Error:', sellerError);

        // CRITICAL: Check for RLS silent failure (no error but no data)
        if (!sellerError && (!newSeller || newSeller.length === 0)) {
          console.error('=== RLS SILENT BLOCK DETECTED ===');
          console.error('Insert returned no data and no error - RLS likely blocking');
          throw new Error(
            'Seller record was NOT created. This is likely an RLS policy issue. ' +
            'Please ensure your admin user has is_admin: true in user_metadata, ' +
            'and the sellers table RLS policy allows admin inserts.'
          );
        }

        if (sellerError) {
          console.error('=== SELLER INSERT ERROR ===');
          console.error('Error object:', JSON.stringify(sellerError, null, 2));
          console.error('Error code:', sellerError.code);
          console.error('Error message:', sellerError.message);
          console.error('Error details:', sellerError.details);
          console.error('Error hint:', sellerError.hint);

          // If RLS blocked it, give a helpful message
          if (sellerError.code === '42501' || sellerError.message?.includes('policy') || sellerError.message?.includes('permission')) {
            throw new Error(
              'Permission denied: Your admin account does not have permission to insert into sellers table. ' +
              'Run this SQL: UPDATE auth.users SET raw_user_meta_data = raw_user_meta_data || \'{"is_admin": true}\'::jsonb WHERE email = \'YOUR_ADMIN_EMAIL\'; ' +
              'Then log out and log back in. Original error: ' + sellerError.message
            );
          }
          throw new Error('Failed to create seller profile: ' + sellerError.message);
        }

        // SUCCESS: Seller was created
        console.log('=== SELLER CREATED SUCCESSFULLY ===');
        console.log('Seller ID:', newSeller[0]?.id);
        console.log('Store Name:', newSeller[0]?.store_name);

        // Show success message
        alert(`Seller "${formData.store_name}" created successfully! They can now login to the Seller Dashboard.`);
      }

      setShowModal(false);
      setEditingSeller(null);
      resetForm();
      fetchSellers();
    } catch (err: any) {
      console.error('=== SELLER CREATION FAILED ===');
      console.error('Error:', err);
      setError(err.message || 'Failed to save seller');
      // DO NOT close modal on error - let user see the error and try again
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this seller? This will NOT delete their products, but they will become unassigned.')) return;

    try {
      const { error } = await supabase.from('sellers').delete().eq('id', id);
      if (error) throw error;
      fetchSellers();
    } catch (err: any) {
      console.error('Error deleting seller:', err);
      alert('Error deleting seller: ' + err.message);
    }
  }

  async function toggleActive(seller: Seller) {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({ is_active: !seller.is_active })
        .eq('id', seller.id);
      if (error) throw error;
      fetchSellers();
    } catch (err: any) {
      console.error('Error toggling status:', err);
      alert('Failed to update seller status');
    }
  }

  async function toggleVerified(seller: Seller) {
    try {
      const { error } = await supabase
        .from('sellers')
        .update({ is_verified: !seller.is_verified })
        .eq('id', seller.id);
      if (error) throw error;
      fetchSellers();
    } catch (err: any) {
      console.error('Error toggling verification:', err);
      alert('Failed to update verification status');
    }
  }

  function openEditModal(seller: Seller) {
    setEditingSeller(seller);
    setFormData({
      user_email: '',        // Not editable for existing sellers
      user_password: '',     // Not editable for existing sellers
      store_name: seller.store_name || '',
      store_description: seller.store_description || '',
      logo_url: seller.logo_url || '',
      contact_email: seller.contact_email || '',
      contact_phone: seller.contact_phone || '',
      business_address: seller.business_address || '',
      is_active: seller.is_active,
      is_verified: seller.is_verified,
    });
    setError('');
    setShowModal(true);
  }

  function resetForm() {
    setFormData({
      user_email: '',
      user_password: '',
      store_name: '',
      store_description: '',
      logo_url: '',
      contact_email: '',
      contact_phone: '',
      business_address: '',
      is_active: false,
      is_verified: false,
    });
    setError('');
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const filteredSellers = sellers.filter((seller) =>
    seller.store_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    seller.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <header className="page-header">
        <h1>Sellers</h1>
        <p>Manage marketplace sellers (admin-controlled registration)</p>
      </header>

      <div className="page-content">
        {error && (
          <div style={styles.errorBanner}>
            <Icons.Warning /> {error}
          </div>
        )}

        <div className="filter-bar">
          <div className="search-box">
            <span><Icons.Search /></span>
            <input
              type="text"
              placeholder="Search by store name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setEditingSeller(null);
              setShowModal(true);
            }}
          >
            + Add Seller
          </button>
        </div>

        {/* Info Banner */}
        <div style={styles.infoBanner}>
          <span style={{ marginRight: '8px' }}><Icons.Info /></span>
          <span>
            Sellers cannot self-register. Create accounts here and share credentials with sellers.
            New sellers are <strong>inactive</strong> by default.
          </span>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h2>All Sellers ({filteredSellers.length})</h2>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Store</th>
                  <th>Contact</th>
                  <th>Products</th>
                  <th>Verified</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSellers.map((seller) => (
                  <tr key={seller.id}>
                    <td>
                      <div className="product-info">
                        <div
                          className="user-avatar"
                          style={{
                            background: seller.is_active ? 'var(--success)' : 'var(--text-muted)',
                            backgroundImage: seller.logo_url ? `url(${seller.logo_url})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }}
                        >
                          {!seller.logo_url && seller.store_name?.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="product-details">
                          <h4>{seller.store_name}</h4>
                          <span style={{ fontSize: '11px', color: '#999' }}>
                            {seller.store_description?.slice(0, 40) || 'No description'}
                            {seller.store_description && seller.store_description.length > 40 ? '...' : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <div style={{ fontSize: '13px' }}>{seller.contact_email || 'N/A'}</div>
                        <small style={{ color: 'var(--text-muted)' }}>
                          {seller.contact_phone || 'No phone'}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className="badge neutral">
                        {seller.products_count || 0} products
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${seller.is_verified ? 'success' : 'neutral'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleVerified(seller)}
                        title="Click to toggle verification"
                      >
                        {seller.is_verified ? '✓ Verified' : 'Unverified'}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${seller.is_active ? 'success' : 'danger'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleActive(seller)}
                        title="Click to toggle active status"
                      >
                        {seller.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{formatDate(seller.created_at)}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="action-btn edit"
                          onClick={() => openEditModal(seller)}
                          title="Edit"
                        >
                          <Icons.Edit />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(seller.id)}
                          title="Delete"
                        >
                          <Icons.Delete />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredSellers.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="icon"><Icons.Sellers /></div>
                        <p>No sellers found</p>
                        <p style={{ fontSize: '12px', color: '#999' }}>
                          Click "Add Seller" to create your first marketplace seller
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Seller Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingSeller ? 'Edit Seller' : 'Add New Seller'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div style={{ ...styles.errorBanner, marginBottom: '16px' }}>
                    ⚠️ {error}
                  </div>
                )}

                {/* Account Credentials - Only for new sellers */}
                {!editingSeller && (
                  <div style={styles.section}>
                    <h3 style={styles.sectionTitle}><Icons.Lock /> Account Credentials</h3>
                    <p style={styles.sectionDesc}>
                      Creates a new Supabase Auth user. Share these credentials with the seller.
                    </p>

                    <div className="form-group">
                      <label>Login Email *</label>
                      <input
                        type="email"
                        value={formData.user_email}
                        onChange={(e) => setFormData({ ...formData, user_email: e.target.value })}
                        placeholder="seller@example.com"
                        required={!editingSeller}
                      />
                    </div>

                    <div className="form-group">
                      <label>Password *</label>
                      <input
                        type="password"
                        value={formData.user_password}
                        onChange={(e) => setFormData({ ...formData, user_password: e.target.value })}
                        placeholder="Minimum 6 characters"
                        required={!editingSeller}
                        minLength={6}
                      />
                    </div>
                  </div>
                )}

                {/* Store Information */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}><Icons.Store /> Store Information</h3>

                  <div className="form-group">
                    <label>Store Name *</label>
                    <input
                      type="text"
                      value={formData.store_name}
                      onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                      placeholder="e.g., Fashion Hub, Tech World"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Store Description</label>
                    <textarea
                      rows={2}
                      value={formData.store_description}
                      onChange={(e) => setFormData({ ...formData, store_description: e.target.value })}
                      placeholder="Brief description of the store..."
                    />
                  </div>

                  <div className="form-group">
                    <label>Logo URL</label>
                    <input
                      type="url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}><Icons.Phone /> Contact Information</h3>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label>Contact Email</label>
                      <input
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        placeholder="contact@store.com"
                      />
                    </div>

                    <div className="form-group">
                      <label>Contact Phone</label>
                      <input
                        type="tel"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Business Address</label>
                    <textarea
                      rows={2}
                      value={formData.business_address}
                      onChange={(e) => setFormData({ ...formData, business_address: e.target.value })}
                      placeholder="Full business address..."
                    />
                  </div>
                </div>

                {/* Status Controls */}
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}><Icons.Settings /> Status</h3>

                  <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        style={styles.checkbox}
                      />
                      <span>Active (can sell products)</span>
                    </label>

                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.is_verified}
                        onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
                        style={styles.checkbox}
                      />
                      <span>Verified Seller</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : editingSeller ? 'Update Seller' : 'Create Seller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Inline styles for sections
const styles: { [key: string]: React.CSSProperties } = {
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  infoBanner: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    color: '#a5b4fc',
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
  },
  section: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-color, #334155)',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#f1f5f9',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '16px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#f1f5f9',
    whiteSpace: 'nowrap' as const,
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
    accentColor: '#6366f1',
  },
};
