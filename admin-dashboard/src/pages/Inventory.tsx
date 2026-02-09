import { useEffect, useState } from 'react';
import { supabase, Inventory, ProductVariant, Product } from '../lib/supabase';
import { Icons } from '../components/Icons';

interface InventoryItem extends Inventory {
  variant?: ProductVariant & { product?: Product };
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    quantity_available: '',
    low_stock_threshold: '',
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          variant:product_variants(
            *,
            product:products(name, brand, image_urls)
          )
        `)
        .order('quantity_available', { ascending: true });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          quantity_available: parseInt(formData.quantity_available),
          low_stock_threshold: parseInt(formData.low_stock_threshold),
        })
        .eq('id', editingItem.id);

      if (error) throw error;
      setShowModal(false);
      setEditingItem(null);
      fetchInventory();
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('Error updating inventory');
    }
  }

  function openEditModal(item: InventoryItem) {
    setEditingItem(item);
    setFormData({
      quantity_available: item.quantity_available.toString(),
      low_stock_threshold: item.low_stock_threshold.toString(),
    });
    setShowModal(true);
  }

  function getStockStatus(item: InventoryItem) {
    if (item.quantity_available === 0) return { label: 'Out of Stock', class: 'danger' };
    if (item.quantity_available <= item.low_stock_threshold) return { label: 'Low Stock', class: 'warning' };
    return { label: 'In Stock', class: 'success' };
  }

  const filteredInventory = inventory.filter((item) => {
    const productName = (item.variant as any)?.product?.name || '';
    const brand = (item.variant as any)?.product?.brand || '';
    const sku = item.variant?.sku || '';
    const matchesSearch =
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStock = true;
    if (stockFilter === 'out') {
      matchesStock = item.quantity_available === 0;
    } else if (stockFilter === 'low') {
      matchesStock = item.quantity_available > 0 && item.quantity_available <= item.low_stock_threshold;
    } else if (stockFilter === 'in') {
      matchesStock = item.quantity_available > item.low_stock_threshold;
    }

    return matchesSearch && matchesStock;
  });

  const lowStockCount = inventory.filter((i) => i.quantity_available > 0 && i.quantity_available <= i.low_stock_threshold).length;
  const outOfStockCount = inventory.filter((i) => i.quantity_available === 0).length;

  return (
    <>
      <header className="page-header">
        <h1>Inventory</h1>
        <p>Track and manage product stock levels</p>
      </header>

      <div className="page-content">
        {/* Quick Stats */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-icon blue"><Icons.Products /></div>
            <div className="stat-content">
              <h3>{inventory.length}</h3>
              <p>Total SKUs</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange"><Icons.Warning /></div>
            <div className="stat-content">
              <h3>{lowStockCount}</h3>
              <p>Low Stock Items</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon red"><Icons.Close /></div>
            <div className="stat-content">
              <h3>{outOfStockCount}</h3>
              <p>Out of Stock</p>
            </div>
          </div>
        </div>

        <div className="filter-bar">
          <div className="search-box">
            <span><Icons.Search /></span>
            <input
              type="text"
              placeholder="Search by product, brand or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
          >
            <option value="">All Stock Levels</option>
            <option value="in">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h2>Inventory Items ({filteredInventory.length})</h2>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Variant</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Threshold</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map((item) => {
                  const status = getStockStatus(item);
                  const variant = item.variant as any;
                  const product = variant?.product;

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="product-info">
                          <img
                            src={product?.image_urls?.[0] || variant?.image_urls?.[0] || 'https://via.placeholder.com/48'}
                            alt={product?.name}
                            className="product-image"
                          />
                          <div className="product-details">
                            <h4>{product?.name || 'Unknown Product'}</h4>
                            <span>{product?.brand}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: '4px' }}>
                          {variant?.sku || '-'}
                        </code>
                      </td>
                      <td>
                        <div>
                          {variant?.size_label && <span>Size: {variant.size_label}</span>}
                          {variant?.color_name && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                              <span
                                style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  background: variant.color_hex || '#ccc',
                                  border: '1px solid var(--border-color)',
                                }}
                              />
                              <span>{variant.color_name}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong style={{ color: item.quantity_available === 0 ? 'var(--danger)' : 'inherit' }}>
                          {item.quantity_available}
                        </strong>
                      </td>
                      <td>{item.quantity_reserved}</td>
                      <td>{item.low_stock_threshold}</td>
                      <td>
                        <span className={`badge ${status.class}`}>{status.label}</span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="action-btn edit"
                            onClick={() => openEditModal(item)}
                            title="Update Stock"
                          >
                            <Icons.Edit />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="icon"><Icons.Inventory /></div>
                        <p>No inventory items found</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit Inventory Modal */}
      {showModal && editingItem && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Stock</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                  <h4>{(editingItem.variant as any)?.product?.name}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    SKU: {editingItem.variant?.sku} |
                    Size: {editingItem.variant?.size_label} |
                    Color: {editingItem.variant?.color_name}
                  </p>
                </div>

                <div className="form-group">
                  <label>Available Quantity</label>
                  <input
                    type="number"
                    value={formData.quantity_available}
                    onChange={(e) => setFormData({ ...formData, quantity_available: e.target.value })}
                    required
                    min="0"
                  />
                </div>

                <div className="form-group">
                  <label>Low Stock Threshold</label>
                  <input
                    type="number"
                    value={formData.low_stock_threshold}
                    onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                    required
                    min="0"
                  />
                  <small style={{ color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Alert will be shown when stock falls below this number
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
