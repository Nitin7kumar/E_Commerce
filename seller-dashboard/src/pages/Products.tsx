import { useState, useEffect, useRef } from 'react';
import { SellerUser, Product, getMyProducts, supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';

interface ProductsProps {
    seller: SellerUser;
}

const CATEGORIES = ['Men', 'Women', 'Kids', 'Footwear', 'Accessories', 'Beauty'];
type SizeType = 'none' | 'clothing' | 'shoe' | 'quantity';

interface ProductColor {
    name: string;
    hex: string;
}

export default function Products({ seller }: ProductsProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        mrp: '',               // Maximum Retail Price
        discount_percent: '0', // Discount percentage
        category: '',
        image_url: '',
        stock: '0',
        is_active: true,
        brand_name: '',
        size_type: 'none' as SizeType,
        sizes: [] as string[],
        colors: [] as ProductColor[],
        default_color: '',
        images: [] as string[],
        highlights: [] as string[],
        attributes: [] as { key: string; value: string }[],
    });

    // Input states for adding new items
    const [newSize, setNewSize] = useState('');
    const [newColorName, setNewColorName] = useState('');
    const [newColorHex, setNewColorHex] = useState('#000000');
    const [newHighlight, setNewHighlight] = useState('');
    const [newAttrKey, setNewAttrKey] = useState('');
    const [newAttrValue, setNewAttrValue] = useState('');

    useEffect(() => {
        fetchProducts();
    }, []);

    async function fetchProducts() {
        if (!seller.seller) return;

        setLoading(true);
        try {
            const data = await getMyProducts(seller.seller.id);
            setProducts(data);
        } catch (err: any) {
            setError('Failed to load products: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    // Image upload handler
    async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const fileArray = Array.from(files);

        // Validate files
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
            const uploadPromises = fileArray.map(async (file) => {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `products/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('product_image')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('product_image')
                    .getPublicUrl(filePath);

                return publicUrl;
            });

            const newUrls = await Promise.all(uploadPromises);
            const updatedImages = [...formData.images, ...newUrls];
            const primaryImage = updatedImages[0] || '';

            setFormData({
                ...formData,
                images: updatedImages,
                image_url: primaryImage
            });
        } catch (err: any) {
            console.error('Upload failed:', err);
            alert('Failed to upload image: ' + (err.message || 'Unknown error'));
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }

    function removeImage(index: number) {
        const updatedImages = formData.images.filter((_, i) => i !== index);
        setFormData({
            ...formData,
            images: updatedImages,
            image_url: updatedImages[0] || ''
        });
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!seller.seller) return;

        setSaving(true);
        setError('');

        try {
            // Prepare sizes
            const sizesData = formData.size_type === 'none' || formData.sizes.length === 0
                ? []
                : formData.sizes;

            // Prepare colors
            const colorsData = formData.colors.length === 0 ? [] : formData.colors;

            // Transform attributes
            const attributesData: { [key: string]: string } | null = formData.attributes.length > 0
                ? formData.attributes.reduce((acc, { key, value }) => {
                    if (key.trim() && value.trim()) {
                        acc[key.trim()] = value.trim();
                    }
                    return acc;
                }, {} as { [key: string]: string })
                : null;

            // Calculate selling price from MRP and discount
            const mrpValue = parseFloat(formData.mrp) || 0;
            const discountValue = parseInt(formData.discount_percent) || 0;
            const sellingPrice = formData.mrp
                ? Math.round(mrpValue * (1 - discountValue / 100))
                : parseFloat(formData.price) || 0;

            const productData = {
                name: formData.name,
                description: formData.description || null,
                price: sellingPrice,
                mrp: mrpValue || null,
                discount_percent: discountValue,
                category: formData.category || null,
                image_url: formData.images[0] || formData.image_url || null,
                stock: parseInt(formData.stock) || 0,
                is_active: formData.is_active,
                brand_name: formData.brand_name || null,
                size_type: formData.size_type,
                sizes: sizesData,
                colors: colorsData,
                default_color: formData.default_color || null,
                images: formData.images.length > 0 ? formData.images : null,
                highlights: formData.highlights.length > 0 ? formData.highlights : null,
                attributes: attributesData,
                seller_id: seller.seller.id,
                seller_name: seller.seller.store_name,
            };

            if (editingProduct) {
                const { error } = await supabase
                    .from('products')
                    .update(productData)
                    .eq('id', editingProduct.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('products')
                    .insert([productData]);
                if (error) throw error;
            }

            setShowModal(false);
            setEditingProduct(null);
            resetForm();
            fetchProducts();
        } catch (err: any) {
            setError('Failed to save product: ' + err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this product?')) return;

        try {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
            fetchProducts();
        } catch (err: any) {
            alert('Failed to delete: ' + err.message);
        }
    }

    function openEditModal(product: Product) {
        setEditingProduct(product);

        // Parse attributes from object to array
        const attributesArray: { key: string; value: string }[] = [];
        if (product.attributes && typeof product.attributes === 'object') {
            Object.entries(product.attributes).forEach(([key, value]) => {
                attributesArray.push({ key, value: String(value) });
            });
        }

        setFormData({
            name: product.name,
            description: product.description || '',
            price: product.price.toString(),
            mrp: product.mrp?.toString() || product.price.toString(),
            discount_percent: product.discount_percent?.toString() || '0',
            category: product.category || '',
            image_url: product.image_url || '',
            stock: product.stock.toString(),
            is_active: product.is_active,
            brand_name: product.brand_name || '',
            size_type: product.size_type || 'none',
            sizes: product.sizes || [],
            colors: product.colors || [],
            default_color: product.default_color || '',
            images: product.images || [],
            highlights: product.highlights || [],
            attributes: attributesArray,
        });
        setShowModal(true);
    }

    function resetForm() {
        setFormData({
            name: '',
            description: '',
            price: '',
            mrp: '',
            discount_percent: '0',
            category: '',
            image_url: '',
            stock: '0',
            is_active: true,
            brand_name: '',
            size_type: 'none',
            sizes: [],
            colors: [],
            default_color: '',
            images: [],
            highlights: [],
            attributes: [],
        });
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

    return (
        <div className="products-page">
            <header className="page-header">
                <div>
                    <h1>My Products</h1>
                    <p>Manage products for {seller.seller?.store_name}</p>
                </div>
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
            </header>

            {error && (
                <div className="error-message">{error}</div>
            )}

            {loading ? (
                <div className="loading">Loading products...</div>
            ) : products.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon"><Icons.Products /></div>
                    <h3>No products yet</h3>
                    <p>Click "Add Product" to create your first product</p>
                </div>
            ) : (
                <div className="products-grid">
                    {products.map((product) => (
                        <div key={product.id} className="product-card">
                            <div className="product-image">
                                {product.image_url ? (
                                    <img src={product.image_url} alt={product.name} />
                                ) : (
                                    <div className="no-image"><Icons.Camera /></div>
                                )}
                                <span className={`status-badge ${product.is_active ? 'active' : 'inactive'}`}>
                                    {product.is_active ? 'Active' : 'Inactive'}
                                </span>
                            </div>
                            <div className="product-info">
                                <h3>{product.name}</h3>
                                <div className="product-pricing">
                                    {product.discount_percent > 0 && product.mrp ? (
                                        <>
                                            <span className="mrp-strikethrough">MRP {formatCurrency(product.mrp)}</span>
                                            <span className="selling-price">{formatCurrency(product.price)}</span>
                                            <span className="discount-badge">({product.discount_percent}% OFF)</span>
                                        </>
                                    ) : (
                                        <span className="price">{formatCurrency(product.price)}</span>
                                    )}
                                </div>
                                <p className="stock">Stock: {product.stock}</p>
                                <p className="category">{product.category || 'No category'}</p>
                            </div>
                            <div className="product-actions">
                                <button onClick={() => openEditModal(product)} className="btn-edit">
                                    Edit
                                </button>
                                <button onClick={() => handleDelete(product.id)} className="btn-delete">
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Product Modal - Full Featured */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
                            <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">

                                {/* IMAGE UPLOAD SECTION */}
                                <div className="form-section">
                                    <h3 className="section-title"><Icons.Camera /> Product Images</h3>
                                    <div className="image-upload-area">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={handleImageUpload}
                                            style={{ display: 'none' }}
                                            id="image-upload"
                                        />
                                        <label htmlFor="image-upload" className="upload-label">
                                            {uploading ? (
                                                <span>Uploading...</span>
                                            ) : (
                                                <>
                                                    <span className="upload-icon"><Icons.Upload /></span>
                                                    <span>Click to upload images</span>
                                                    <span className="upload-hint">Max 5MB per image</span>
                                                </>
                                            )}
                                        </label>
                                    </div>

                                    {/* Image Preview */}
                                    {formData.images.length > 0 && (
                                        <div className="image-preview-grid">
                                            {formData.images.map((url, index) => (
                                                <div key={index} className="image-preview-item">
                                                    <img src={url} alt={`Product ${index + 1}`} />
                                                    {index === 0 && <span className="primary-badge">Primary</span>}
                                                    <button
                                                        type="button"
                                                        className="remove-image-btn"
                                                        onClick={() => removeImage(index)}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* BASIC INFO */}
                                <div className="form-section">
                                    <h3 className="section-title"><Icons.Document /> Basic Information</h3>

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

                                    <div className="form-group">
                                        <label>Brand Name</label>
                                        <input
                                            type="text"
                                            value={formData.brand_name}
                                            onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                                            placeholder="e.g., Nike, Adidas"
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
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

                                    {/* Pricing Section */}
                                    <div className="form-row form-row-three">
                                        <div className="form-group">
                                            <label>MRP (₹) *</label>
                                            <input
                                                type="number"
                                                value={formData.mrp}
                                                onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                                                required
                                                min="0"
                                                step="0.01"
                                                placeholder="1999"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Discount %</label>
                                            <input
                                                type="number"
                                                value={formData.discount_percent}
                                                onChange={(e) => {
                                                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                    setFormData({ ...formData, discount_percent: val.toString() });
                                                }}
                                                min="0"
                                                max="100"
                                                placeholder="35"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label>Stock</label>
                                            <input
                                                type="number"
                                                value={formData.stock}
                                                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                                                min="0"
                                                placeholder="100"
                                            />
                                        </div>
                                    </div>

                                    {/* Price Preview */}
                                    {formData.mrp && parseFloat(formData.mrp) > 0 && (
                                        <div className="price-preview">
                                            <span className="price-preview-label">Selling Price:</span>
                                            <span className="price-preview-mrp">MRP ₹{parseFloat(formData.mrp).toLocaleString('en-IN')}</span>
                                            <span className="price-preview-selling">
                                                ₹{Math.round(parseFloat(formData.mrp) * (1 - (parseInt(formData.discount_percent) || 0) / 100)).toLocaleString('en-IN')}
                                            </span>
                                            {parseInt(formData.discount_percent) > 0 && (
                                                <span className="price-preview-discount">({formData.discount_percent}% OFF)</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* SIZE & COLOR */}
                                <div className="form-section">
                                    <h3 className="section-title"><Icons.Size /> Sizes & Colors</h3>

                                    <div className="form-group">
                                        <label>Size Type</label>
                                        <select
                                            value={formData.size_type}
                                            onChange={(e) => {
                                                const newSizeType = e.target.value as SizeType;
                                                setFormData({
                                                    ...formData,
                                                    size_type: newSizeType,
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

                                    {/* Sizes Input */}
                                    {formData.size_type !== 'none' && (
                                        <div className="form-group">
                                            <label>Available Sizes</label>
                                            <div className="input-with-button">
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
                                            <div className="tags-container">
                                                {formData.sizes.map((size, index) => (
                                                    <span key={index} className="tag">
                                                        {size}
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({
                                                                ...formData,
                                                                sizes: formData.sizes.filter((_, i) => i !== index)
                                                            })}
                                                        >×</button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Colors Input */}
                                    <div className="form-group">
                                        <label>Colors</label>
                                        <div className="input-with-button color-input">
                                            <input
                                                type="text"
                                                value={newColorName}
                                                onChange={(e) => setNewColorName(e.target.value)}
                                                placeholder="Color name (e.g., Black)"
                                            />
                                            <input
                                                type="color"
                                                value={newColorHex}
                                                onChange={(e) => setNewColorHex(e.target.value)}
                                                className="color-picker"
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
                                        <div className="tags-container">
                                            {formData.colors.map((color, index) => (
                                                <span key={index} className="tag color-tag">
                                                    <span
                                                        className="color-dot"
                                                        style={{ backgroundColor: color.hex }}
                                                    />
                                                    {color.name}
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            colors: formData.colors.filter((_, i) => i !== index)
                                                        })}
                                                    >×</button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Default Color */}
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
                                </div>

                                {/* HIGHLIGHTS & ATTRIBUTES */}
                                <div className="form-section">
                                    <h3 className="section-title"><Icons.Sparkle /> Highlights & Details</h3>

                                    {/* Highlights */}
                                    <div className="form-group">
                                        <label>Product Highlights</label>
                                        <div className="input-with-button">
                                            <input
                                                type="text"
                                                value={newHighlight}
                                                onChange={(e) => setNewHighlight(e.target.value)}
                                                placeholder="e.g., 100% Cotton"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        if (newHighlight.trim()) {
                                                            setFormData({ ...formData, highlights: [...formData.highlights, newHighlight.trim()] });
                                                            setNewHighlight('');
                                                        }
                                                    }
                                                }}
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
                                        <div className="highlights-list">
                                            {formData.highlights.map((highlight, index) => (
                                                <div key={index} className="highlight-item">
                                                    <span>• {highlight}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            highlights: formData.highlights.filter((_, i) => i !== index)
                                                        })}
                                                    >×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Attributes */}
                                    <div className="form-group">
                                        <label>Product Attributes</label>
                                        <div className="attribute-input">
                                            <input
                                                type="text"
                                                value={newAttrKey}
                                                onChange={(e) => setNewAttrKey(e.target.value)}
                                                placeholder="Key (e.g., Material)"
                                            />
                                            <input
                                                type="text"
                                                value={newAttrValue}
                                                onChange={(e) => setNewAttrValue(e.target.value)}
                                                placeholder="Value (e.g., Cotton)"
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
                                        <div className="attributes-list">
                                            {formData.attributes.map((attr, index) => (
                                                <div key={index} className="attribute-item">
                                                    <span><strong>{attr.key}:</strong> {attr.value}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({
                                                            ...formData,
                                                            attributes: formData.attributes.filter((_, i) => i !== index)
                                                        })}
                                                    >×</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* STATUS */}
                                <div className="form-section">
                                    <div className="form-group checkbox">
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={formData.is_active}
                                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                            />
                                            Active (visible to customers)
                                        </label>
                                    </div>
                                </div>

                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
