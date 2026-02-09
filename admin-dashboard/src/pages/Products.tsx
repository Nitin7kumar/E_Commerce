import { useEffect, useState, useRef } from 'react';
import { Product, SizeType, ProductColor, productService, storageService, supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';

// Predefined categories for simplicity
const CATEGORIES = ['Men', 'Women', 'Kids', 'Footwear', 'Accessories', 'Beauty'];

// Extended Product type with seller info for display
interface ProductWithSeller extends Product {
  seller?: { id: string; store_name: string; is_verified: boolean } | null;
}

// Minimal seller info needed for the dropdown
interface SellerOption {
  id: string;
  store_name: string;
  is_verified: boolean;
  is_active: boolean;
}

export default function Products() {
  const [products, setProducts] = useState<ProductWithSeller[]>([]);
  const [sellers, setSellers] = useState<SellerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSellerFilter, setSelectedSellerFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithSeller | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    stock: '0',
    is_active: true,
    // New attribute fields
    brand_name: '',
    size_type: 'none' as SizeType,
    sizes: [] as string[],
    colors: [] as ProductColor[],
    default_color: '',
    // Multiple images support
    images: [] as string[],
    // Structured product information (Phase 1 - Step 1)
    highlights: [] as string[],
    attributes: [] as { key: string; value: string }[],
    seller_name: '',
    // Seller assignment (Phase 2 - Marketplace)
    seller_id: '' as string,
  });

  // State for size/color input fields
  const [newSize, setNewSize] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#000000');
  // State for highlights and attributes input
  const [newHighlight, setNewHighlight] = useState('');
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  useEffect(() => {
    fetchProducts();
    fetchSellers();
  }, []);

  // Fetch all active sellers for the dropdown
  async function fetchSellers() {
    try {
      const { data, error } = await supabase
        .from('sellers')
        .select('id, store_name, is_verified, is_active')
        .order('store_name', { ascending: true });

      if (error) throw error;
      setSellers(data || []);
    } catch (err) {
      console.error('Error fetching sellers:', err);
    }
  }

  async function fetchProducts() {
    setLoading(true);
    setError('');
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products. Make sure the products table exists.');
    } finally {
      setLoading(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Process all selected files
    const fileArray = Array.from(files);

    // Validate all files
    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) {
        alert('Please select only image files');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Each image must be less than 5MB');
        return;
      }
    }

    setUploading(true);
    try {
      // Upload all images and collect URLs
      const uploadPromises = fileArray.map(file => storageService.uploadProductImage(file));
      const newUrls = await Promise.all(uploadPromises);

      // Add new URLs to existing images
      const updatedImages = [...formData.images, ...newUrls];

      // Set first image as primary (image_url for backward compatibility)
      const primaryImage = updatedImages[0] || '';

      setFormData({
        ...formData,
        images: updatedImages,
        image_url: primaryImage
      });
    } catch (err: any) {
      console.error('Upload failed:', err);
      const errorMsg = err?.message || err?.error_description || 'Unknown error';
      alert(`Failed to upload image: ${errorMsg}\n\nMake sure:\n1. You are logged in as admin\n2. Storage bucket "product_image" has upload policies`);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Prepare sizes array: empty array if size_type is 'none' or no sizes
    const sizesData = formData.size_type === 'none' || formData.sizes.length === 0
      ? []
      : formData.sizes;

    // Prepare colors array: keep as-is
    const colorsData = formData.colors.length === 0 ? [] : formData.colors;

    // Transform attributes from form array [{key, value}] to database object {key: value}
    const attributesData: { [key: string]: string } | null = formData.attributes.length > 0
      ? formData.attributes.reduce((acc, { key, value }) => {
        if (key.trim() && value.trim()) {
          acc[key.trim()] = value.trim();
        }
        return acc;
      }, {} as { [key: string]: string })
      : null;

    const productData = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price),
      category: formData.category || null,
      image_url: formData.images[0] || formData.image_url || null, // First image is primary
      stock: parseInt(formData.stock) || 0,
      is_active: formData.is_active,
      // New attribute fields
      brand_name: formData.brand_name || null,
      size_type: formData.size_type,
      sizes: sizesData,
      colors: colorsData,
      default_color: formData.default_color || null,
      // Multiple images
      images: formData.images.length > 0 ? formData.images : null,
      // Structured product information (Phase 1 - Step 1)
      highlights: formData.highlights.length > 0 ? formData.highlights : null,
      attributes: attributesData,
      seller_name: formData.seller_name || null,
      // Seller assignment (Phase 2)
      seller_id: formData.seller_id || null,
    };

    try {
      if (editingProduct) {
        await productService.update(editingProduct.id, productData);
      } else {
        await productService.create(productData);
      }

      setShowModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product. Check console for details.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      await productService.delete(id);
      fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      alert('Failed to delete product');
    }
  }

  async function handleToggleActive(product: Product) {
    try {
      await productService.toggleActive(product.id, product.is_active);
      fetchProducts();
    } catch (err) {
      console.error('Error toggling product status:', err);
    }
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    // Build images array from product.images or fallback to image_url
    const productImages = product.images && product.images.length > 0
      ? product.images
      : product.image_url
        ? [product.image_url]
        : [];

    // Transform attributes from database object {key: value} to form array [{key, value}]
    const formAttributes = product.attributes
      ? Object.entries(product.attributes).map(([key, value]) => ({ key, value }))
      : [];

    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category || '',
      image_url: product.image_url || '',
      stock: product.stock.toString(),
      is_active: product.is_active,
      // New attribute fields
      brand_name: product.brand_name || '',
      size_type: product.size_type || 'none',
      sizes: product.sizes || [],
      colors: product.colors || [],
      default_color: product.default_color || '',
      // Multiple images
      images: productImages,
      // Structured product information (Phase 1 - Step 1)
      highlights: product.highlights || [],
      attributes: formAttributes,
      seller_name: product.seller_name || '',
      // Seller assignment
      seller_id: product.seller_id || '',
    });
    // Reset input states
    setNewSize('');
    setNewColorName('');
    setNewColorHex('#000000');
    setNewHighlight('');
    setNewAttrKey('');
    setNewAttrValue('');
    setShowModal(true);
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image_url: '',
      stock: '0',
      is_active: true,
      // New attribute fields
      brand_name: '',
      size_type: 'none',
      sizes: [],
      colors: [],
      default_color: '',
      // Multiple images
      images: [],
      // Structured product information (Phase 1 - Step 1)
      highlights: [],
      attributes: [],
      seller_name: '',
      // Seller assignment
      seller_id: '',
    });
    // Reset input states
    setNewSize('');
    setNewColorName('');
    setNewColorHex('#000000');
    setNewHighlight('');
    setNewAttrKey('');
    setNewAttrValue('');
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesSeller = !selectedSellerFilter || product.seller_id === selectedSellerFilter;
    return matchesSearch && matchesCategory && matchesSeller;
  });

  return (
    <>
      <header className="page-header">
        <h1>Products</h1>
        <p>Manage your product catalog</p>
      </header>

      <div className="page-content">
        {error && (
          <div style={styles.errorBanner}>
            ⚠ {error}
          </div>
        )}

        <div className="filter-bar">
          <div className="search-box">
            <span><Icons.Search /></span>
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="filter-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            className="filter-select"
            value={selectedSellerFilter}
            onChange={(e) => setSelectedSellerFilter(e.target.value)}
          >
            <option value="">All Sellers</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.store_name} {!seller.is_active ? '(inactive)' : ''}
              </option>
            ))}
          </select>

          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setEditingProduct(null);
              setShowModal(true);
            }}
          >
            + Add Product
          </button>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h2>All Products ({filteredProducts.length})</h2>
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
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-info">
                        <img
                          src={product.image_url || 'https://via.placeholder.com/48?text=No+Image'}
                          alt={product.name}
                          className="product-image"
                          style={{ objectFit: 'cover' }}
                        />
                        <div className="product-details">
                          <h4>{product.name}</h4>
                          <span style={{ fontSize: '11px', color: '#999' }}>
                            ID: {product.id.slice(0, 8)}...
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>{product.category || '-'}</td>
                    <td>
                      <strong>{formatCurrency(product.price)}</strong>
                    </td>
                    <td>
                      <span
                        className={`badge ${product.stock === 0
                          ? 'danger'
                          : product.stock < 10
                            ? 'warning'
                            : 'success'
                          }`}
                      >
                        {product.stock} in stock
                      </span>
                    </td>
                    <td>
                      <span
                        className={`badge ${product.is_active ? 'success' : 'neutral'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggleActive(product)}
                      >
                        {product.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="action-btn edit"
                          onClick={() => openEditModal(product)}
                          title="Edit"
                        >
                          <Icons.Edit />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(product.id)}
                          title="Delete"
                        >
                          <Icons.Delete />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="icon"><Icons.Products /></div>
                        <p>No products found</p>
                        {!loading && products.length === 0 && (
                          <p style={{ fontSize: '12px', color: '#999' }}>
                            Click "Add Product" to create your first product
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Multi-Image Upload */}
                <div className="form-group">
                  <label>Product Images <span style={{ fontWeight: 'normal', color: '#666' }}>(first image is primary)</span></label>
                  <div style={styles.multiImageUpload}>
                    {/* Existing images grid */}
                    <div style={styles.imagesGrid}>
                      {formData.images.map((url, index) => (
                        <div key={index} style={styles.imageThumb}>
                          <img src={url} alt={`Product ${index + 1}`} style={styles.thumbImg} />
                          {index === 0 && (
                            <span style={styles.primaryBadge}>Primary</span>
                          )}
                          <button
                            type="button"
                            style={styles.removeThumbBtn}
                            onClick={() => {
                              const newImages = formData.images.filter((_, i) => i !== index);
                              setFormData({
                                ...formData,
                                images: newImages,
                                image_url: newImages[0] || ''
                              });
                            }}
                          >
                            ×
                          </button>
                          {/* Move buttons for reordering */}
                          {index > 0 && (
                            <button
                              type="button"
                              style={{ ...styles.moveBtn, left: '4px' }}
                              onClick={() => {
                                const newImages = [...formData.images];
                                [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
                                setFormData({
                                  ...formData,
                                  images: newImages,
                                  image_url: newImages[0] || ''
                                });
                              }}
                              title="Move left"
                            >
                              ◀
                            </button>
                          )}
                          {index < formData.images.length - 1 && (
                            <button
                              type="button"
                              style={{ ...styles.moveBtn, right: '4px' }}
                              onClick={() => {
                                const newImages = [...formData.images];
                                [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
                                setFormData({
                                  ...formData,
                                  images: newImages,
                                  image_url: newImages[0] || ''
                                });
                              }}
                              title="Move right"
                            >
                              ▶
                            </button>
                          )}
                        </div>
                      ))}

                      {/* Add more images button */}
                      <div
                        style={styles.addImageBtn}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {uploading ? (
                          <span style={{ fontSize: '14px' }}>Uploading...</span>
                        ) : (
                          <>
                            <span style={{ fontSize: '24px' }}>+</span>
                            <span style={{ fontSize: '11px' }}>Add Images</span>
                          </>
                        )}
                      </div>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      style={{ display: 'none' }}
                    />

                    {formData.images.length === 0 && (
                      <p style={{ fontSize: '12px', color: '#666', margin: '8px 0 0' }}>
                        Click to upload product images. You can add multiple images.
                      </p>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>Product Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Cotton T-Shirt"
                    required
                  />
                </div>

                {/* Brand Name - NEW */}
                <div className="form-group">
                  <label>Brand Name</label>
                  <input
                    type="text"
                    value={formData.brand_name}
                    onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                    placeholder="e.g., Nike, Adidas, Lakme"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description..."
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label>Price (₹) *</label>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="499"
                      required
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="form-group">
                    <label>Stock</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      placeholder="100"
                      min="0"
                    />
                  </div>
                </div>

                {/* SIZE TYPE & SIZES - NEW */}
                <div className="form-group">
                  <label>Size Type</label>
                  <select
                    value={formData.size_type}
                    onChange={(e) => {
                      const newSizeType = e.target.value as SizeType;
                      setFormData({
                        ...formData,
                        size_type: newSizeType,
                        // Clear sizes when switching to 'none'
                        sizes: newSizeType === 'none' ? [] : formData.sizes
                      });
                    }}
                  >
                    <option value="none">None (no sizes)</option>
                    <option value="clothing">Clothing (S, M, L, XL)</option>
                    <option value="shoe">Shoe (6, 7, 8, 9...)</option>
                    <option value="quantity">Quantity (50ml, 100g...)</option>
                  </select>
                </div>

                {/* Sizes Input - shown only if size_type is not 'none' */}
                {formData.size_type !== 'none' && (
                  <div className="form-group">
                    <label>
                      Available Sizes
                      <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                        ({formData.size_type === 'clothing' ? 'e.g., S, M, L' :
                          formData.size_type === 'shoe' ? 'e.g., 6, 7, 8' :
                            'e.g., 50ml, 100g'})
                      </span>
                    </label>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        type="text"
                        value={newSize}
                        onChange={(e) => setNewSize(e.target.value)}
                        placeholder="Enter size..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newSize.trim() && !formData.sizes.includes(newSize.trim())) {
                              setFormData({ ...formData, sizes: [...formData.sizes, newSize.trim()] });
                              setNewSize('');
                            }
                          }
                        }}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          if (newSize.trim() && !formData.sizes.includes(newSize.trim())) {
                            setFormData({ ...formData, sizes: [...formData.sizes, newSize.trim()] });
                            setNewSize('');
                          }
                        }}
                      >
                        Add
                      </button>
                    </div>
                    {/* Display current sizes */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {formData.sizes.map((size, index) => (
                        <span
                          key={index}
                          style={styles.tag}
                        >
                          {size}
                          <button
                            type="button"
                            style={styles.tagRemove}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                sizes: formData.sizes.filter((_, i) => i !== index)
                              });
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* COLORS - NEW */}
                <div className="form-group">
                  <label>Colors (optional)</label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={newColorName}
                      onChange={(e) => setNewColorName(e.target.value)}
                      placeholder="Color name (e.g., Black)"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="color"
                      value={newColorHex}
                      onChange={(e) => setNewColorHex(e.target.value)}
                      style={{ width: '50px', padding: '4px', cursor: 'pointer' }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (newColorName.trim()) {
                          const exists = formData.colors.some(
                            c => c.name.toLowerCase() === newColorName.trim().toLowerCase()
                          );
                          if (!exists) {
                            setFormData({
                              ...formData,
                              colors: [...formData.colors, { name: newColorName.trim(), hex: newColorHex }]
                            });
                            setNewColorName('');
                            setNewColorHex('#000000');
                          }
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {/* Display current colors */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {formData.colors.map((color, index) => (
                      <span
                        key={index}
                        style={{ ...styles.tag, display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <span
                          style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: color.hex,
                            border: '1px solid #ccc'
                          }}
                        />
                        {color.name}
                        <button
                          type="button"
                          style={styles.tagRemove}
                          onClick={() => {
                            const newColors = formData.colors.filter((_, i) => i !== index);
                            // Clear default_color if removed
                            const newDefault = formData.default_color === color.name ? '' : formData.default_color;
                            setFormData({ ...formData, colors: newColors, default_color: newDefault });
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* DEFAULT COLOR - shown only if colors exist */}
                {formData.colors.length > 0 && (
                  <div className="form-group">
                    <label>Default Color</label>
                    <select
                      value={formData.default_color}
                      onChange={(e) => setFormData({ ...formData, default_color: e.target.value })}
                    >
                      <option value="">Select Default</option>
                      {formData.colors.map((color, index) => (
                        <option key={index} value={color.name}>{color.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* ===== STRUCTURED PRODUCT INFORMATION (Phase 1 - Step 1) ===== */}

                {/* SELLER ASSIGNMENT - Dropdown from sellers table */}
                <div className="form-group">
                  <label>Assign to Seller</label>
                  <select
                    value={formData.seller_id}
                    onChange={(e) => {
                      const sellerId = e.target.value;
                      const selectedSeller = sellers.find(s => s.id === sellerId);
                      setFormData({
                        ...formData,
                        seller_id: sellerId,
                        // Auto-fill seller_name from selected seller
                        seller_name: selectedSeller?.store_name || formData.seller_name,
                      });
                    }}
                  >
                    <option value="">No seller (Platform product)</option>
                    {sellers.filter(s => s.is_active).map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.store_name} {seller.is_verified ? '✓' : ''}
                      </option>
                    ))}
                    {/* Show inactive sellers in a separate group */}
                    {sellers.filter(s => !s.is_active).length > 0 && (
                      <optgroup label="Inactive Sellers">
                        {sellers.filter(s => !s.is_active).map((seller) => (
                          <option key={seller.id} value={seller.id} disabled>
                            {seller.store_name} (inactive)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <span style={{ fontSize: '11px', color: '#666', marginTop: '4px', display: 'block' }}>
                    Products assigned to sellers will show their store name
                  </span>
                </div>

                {/* SELLER NAME - Manual override or fallback */}
                <div className="form-group">
                  <label>Display Name Override <span style={{ fontWeight: 'normal', color: '#666' }}>(optional)</span></label>
                  <input
                    type="text"
                    value={formData.seller_name}
                    onChange={(e) => setFormData({ ...formData, seller_name: e.target.value })}
                    placeholder="Leave empty to use seller's store name"
                  />
                </div>

                {/* HIGHLIGHTS - Dynamic bullet points */}
                <div className="form-group">
                  <label>
                    Product Highlights
                    <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                      (bullet points)
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={newHighlight}
                      onChange={(e) => setNewHighlight(e.target.value)}
                      placeholder="e.g., 100% Cotton fabric"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newHighlight.trim()) {
                            setFormData({ ...formData, highlights: [...formData.highlights, newHighlight.trim()] });
                            setNewHighlight('');
                          }
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (newHighlight.trim()) {
                          setFormData({ ...formData, highlights: [...formData.highlights, newHighlight.trim()] });
                          setNewHighlight('');
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {/* Display current highlights */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {formData.highlights.map((highlight, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          backgroundColor: '#f9fafb',
                          borderRadius: '6px',
                          border: '1px solid #e5e7eb'
                        }}
                      >
                        <span style={{ color: '#10b981', fontWeight: 'bold' }}>•</span>
                        <span style={{ flex: 1, fontSize: '13px' }}>{highlight}</span>
                        <button
                          type="button"
                          style={styles.tagRemove}
                          onClick={() => {
                            setFormData({
                              ...formData,
                              highlights: formData.highlights.filter((_, i) => i !== index)
                            });
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ATTRIBUTES - Dynamic key-value pairs */}
                <div className="form-group">
                  <label>
                    Product Attributes
                    <span style={{ fontWeight: 'normal', color: '#666', marginLeft: '8px' }}>
                      (specifications table)
                    </span>
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <input
                      type="text"
                      value={newAttrKey}
                      onChange={(e) => setNewAttrKey(e.target.value)}
                      placeholder="Key (e.g., Material)"
                      style={{ flex: 1 }}
                    />
                    <input
                      type="text"
                      value={newAttrValue}
                      onChange={(e) => setNewAttrValue(e.target.value)}
                      placeholder="Value (e.g., Cotton)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newAttrKey.trim() && newAttrValue.trim()) {
                            setFormData({
                              ...formData,
                              attributes: [...formData.attributes, { key: newAttrKey.trim(), value: newAttrValue.trim() }]
                            });
                            setNewAttrKey('');
                            setNewAttrValue('');
                          }
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        if (newAttrKey.trim() && newAttrValue.trim()) {
                          setFormData({
                            ...formData,
                            attributes: [...formData.attributes, { key: newAttrKey.trim(), value: newAttrValue.trim() }]
                          });
                          setNewAttrKey('');
                          setNewAttrValue('');
                        }
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {/* Display current attributes as table */}
                  {formData.attributes.length > 0 && (
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                      {formData.attributes.map((attr, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '8px 12px',
                            backgroundColor: index % 2 === 0 ? '#f9fafb' : '#fff',
                            borderBottom: index < formData.attributes.length - 1 ? '1px solid #e5e7eb' : 'none'
                          }}
                        >
                          <span style={{ flex: 1, fontWeight: 500, fontSize: '13px', color: '#374151' }}>
                            {attr.key}
                          </span>
                          <span style={{ flex: 1, fontSize: '13px', color: '#6b7280' }}>
                            {attr.value}
                          </span>
                          <button
                            type="button"
                            style={styles.tagRemove}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                attributes: formData.attributes.filter((_, i) => i !== index)
                              });
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    Active (visible to customers)
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving || uploading}
                >
                  {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    marginBottom: '16px',
    border: '1px solid #fecaca',
  },
  imageUpload: {
    width: '100%',
  },
  imagePreview: {
    position: 'relative',
    width: '120px',
    height: '120px',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  previewImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  uploadPlaceholder: {
    width: '120px',
    height: '120px',
    border: '2px dashed #ddd',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer',
    color: '#999',
    fontSize: '12px',
  },
  // Tag styles for sizes and colors
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    backgroundColor: '#f3f4f6',
    borderRadius: '16px',
    fontSize: '13px',
    color: '#374151',
  },
  tagRemove: {
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    fontSize: '14px',
    padding: '0 2px',
    marginLeft: '2px',
    lineHeight: 1,
  },
  // Multi-image upload styles
  multiImageUpload: {
    width: '100%',
  },
  imagesGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px',
  },
  imageThumb: {
    position: 'relative',
    width: '100px',
    height: '100px',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  primaryBadge: {
    position: 'absolute',
    top: '4px',
    left: '4px',
    padding: '2px 6px',
    backgroundColor: '#10b981',
    color: 'white',
    fontSize: '9px',
    fontWeight: 'bold',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  removeThumbBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: 'none',
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    lineHeight: 1,
  },
  moveBtn: {
    position: 'absolute',
    bottom: '4px',
    width: '20px',
    height: '20px',
    borderRadius: '4px',
    border: 'none',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
  },
  addImageBtn: {
    width: '100px',
    height: '100px',
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    color: '#9ca3af',
    transition: 'border-color 0.2s, color 0.2s',
  },
};
