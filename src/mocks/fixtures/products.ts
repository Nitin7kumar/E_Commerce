import { Product } from '../../types';

const brands = [
  'Roadster', 'HRX', 'Puma', 'Nike', 'Adidas', 'Levis', 'H&M', 'Zara',
  'Allen Solly', 'Van Heusen', 'Louis Philippe', 'Peter England',
  'Mango', 'Forever 21', 'FabIndia', 'Biba', 'W', 'Aurelia',
];

const mensDescriptions = [
  'Crafted from premium cotton for all-day comfort. Perfect for casual outings.',
  'Slim fit design with stretch fabric for maximum flexibility.',
  'Classic regular fit with breathable fabric ideal for everyday wear.',
  'Modern design meets traditional craftsmanship in this wardrobe essential.',
];

const womensDescriptions = [
  'Elegant design with intricate detailing for a sophisticated look.',
  'Comfortable yet stylish, perfect for both work and casual occasions.',
  'Flattering silhouette with premium quality fabric.',
  'Trendy design inspired by the latest runway collections.',
];

const generateSizes = (type: 'clothing' | 'footwear' | 'accessory'): Product['sizes'] => {
  if (type === 'clothing') {
    return [
      { label: 'XS', available: Math.random() > 0.3 },
      { label: 'S', available: true },
      { label: 'M', available: true },
      { label: 'L', available: true },
      { label: 'XL', available: Math.random() > 0.2 },
      { label: 'XXL', available: Math.random() > 0.5 },
    ];
  } else if (type === 'footwear') {
    return [
      { label: '6', available: Math.random() > 0.4 },
      { label: '7', available: true },
      { label: '8', available: true },
      { label: '9', available: true },
      { label: '10', available: Math.random() > 0.3 },
      { label: '11', available: Math.random() > 0.5 },
    ];
  }
  return [{ label: 'One Size', available: true }];
};

const generateColors = (): Product['colors'] => {
  const allColors = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Navy', hex: '#1A237E' },
    { name: 'Grey', hex: '#757575' },
    { name: 'Red', hex: '#D32F2F' },
    { name: 'Blue', hex: '#1976D2' },
    { name: 'Green', hex: '#388E3C' },
    { name: 'Pink', hex: '#E91E63' },
    { name: 'Beige', hex: '#F5F5DC' },
    { name: 'Brown', hex: '#795548' },
  ];
  
  const count = Math.floor(Math.random() * 4) + 2;
  const shuffled = allColors.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(c => ({ ...c, available: Math.random() > 0.2 }));
};

const productImages = {
  men: [
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400',
    'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400',
    'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400',
    'https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400',
  ],
  women: [
    'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400',
    'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=400',
    'https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=400',
    'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400',
    'https://images.unsplash.com/photo-1539008835657-9e8e9680c956?w=400',
  ],
  kids: [
    'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=400',
    'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?w=400',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400',
  ],
  footwear: [
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400',
    'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=400',
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=400',
  ],
  accessories: [
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
  ],
  beauty: [
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
    'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400',
  ],
};

const productNames = {
  'men-tshirts': ['Solid Round Neck T-Shirt', 'Printed Crew Neck Tee', 'Striped Polo T-Shirt', 'Graphic Print Tee', 'V-Neck Cotton Tee'],
  'men-shirts': ['Slim Fit Casual Shirt', 'Checked Cotton Shirt', 'Printed Linen Shirt', 'Denim Casual Shirt', 'Oxford Casual Shirt'],
  'men-jeans': ['Slim Fit Stretchable Jeans', 'Regular Fit Denim', 'Skinny Fit Jeans', 'Relaxed Fit Jeans', 'Distressed Denim'],
  'women-dresses': ['Floral Maxi Dress', 'Bodycon Midi Dress', 'A-Line Casual Dress', 'Wrap Dress', 'Shift Dress'],
  'women-tops': ['Solid Peplum Top', 'Printed Blouse', 'Off-Shoulder Top', 'Crop Top', 'Ruffled Top'],
  'women-kurtas': ['Embroidered Anarkali', 'Printed A-Line Kurta', 'Straight Fit Kurta', 'Cotton Kurti', 'Silk Blend Kurta'],
  'footwear-sneakers': ['Running Sneakers', 'Canvas Sneakers', 'High-Top Sneakers', 'Slip-On Sneakers', 'Retro Sneakers'],
  'footwear-casual': ['Loafers', 'Boat Shoes', 'Moccasins', 'Espadrilles', 'Canvas Shoes'],
  'accessories-watches': ['Analog Watch', 'Digital Sports Watch', 'Chronograph Watch', 'Smart Watch', 'Classic Leather Watch'],
  'accessories-bags': ['Tote Bag', 'Sling Bag', 'Backpack', 'Clutch', 'Messenger Bag'],
};

const generateProductForSubcategory = (
  subcategoryId: string,
  categoryId: string,
  index: number
): Product => {
  const basePrice = Math.floor(Math.random() * 3000) + 499;
  const discount = Math.floor(Math.random() * 60) + 10;
  const discountedPrice = Math.floor(basePrice * (1 - discount / 100));
  
  const names = productNames[subcategoryId as keyof typeof productNames] || 
    ['Premium Product', 'Classic Style', 'Modern Design', 'Trendy Fashion', 'Essential Wear'];
  
  const images = productImages[categoryId as keyof typeof productImages] || productImages.men;
  const descriptions = categoryId === 'women' ? womensDescriptions : mensDescriptions;
  
  const sizeType = categoryId === 'footwear' ? 'footwear' : 
    categoryId === 'accessories' ? 'accessory' : 'clothing';

  return {
    id: `${subcategoryId}-${index}`,
    name: names[index % names.length],
    brand: brands[Math.floor(Math.random() * brands.length)],
    price: discountedPrice,
    originalPrice: basePrice,
    discount,
    rating: Number((Math.random() * 1.5 + 3.5).toFixed(1)),
    ratingCount: Math.floor(Math.random() * 5000) + 100,
    images: [
      images[index % images.length],
      images[(index + 1) % images.length],
      images[(index + 2) % images.length],
    ],
    sizes: generateSizes(sizeType),
    colors: generateColors(),
    description: descriptions[index % descriptions.length],
    categoryId,
    subcategoryId,
    tags: ['trending', 'bestseller', 'new arrival'].slice(0, Math.floor(Math.random() * 3) + 1),
    inStock: Math.random() > 0.1,
    deliveryDays: Math.floor(Math.random() * 5) + 2,
  };
};

// Generate products for all subcategories
export const products: Product[] = [];

import { categories } from './categories';

categories.forEach(category => {
  category.subcategories.forEach(subcategory => {
    for (let i = 0; i < 10; i++) {
      products.push(generateProductForSubcategory(subcategory.id, category.id, i));
    }
  });
});

// Helper functions
export const getProductById = (id: string): Product | undefined => {
  return products.find(p => p.id === id);
};

export const getProductsByCategory = (categoryId: string): Product[] => {
  return products.filter(p => p.categoryId === categoryId);
};

export const getProductsBySubcategory = (subcategoryId: string): Product[] => {
  return products.filter(p => p.subcategoryId === subcategoryId);
};

export const searchProducts = (query: string): Product[] => {
  const lowerQuery = query.toLowerCase();
  return products.filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    p.brand.toLowerCase().includes(lowerQuery) ||
    p.tags.some(t => t.toLowerCase().includes(lowerQuery))
  );
};

export const getTrendingProducts = (): Product[] => {
  return products
    .filter(p => p.tags.includes('trending'))
    .sort((a, b) => b.ratingCount - a.ratingCount)
    .slice(0, 20);
};

export const getNewArrivals = (): Product[] => {
  return products
    .filter(p => p.tags.includes('new arrival'))
    .slice(0, 20);
};

export const getBestsellers = (): Product[] => {
  return products
    .filter(p => p.tags.includes('bestseller'))
    .sort((a, b) => b.ratingCount - a.ratingCount)
    .slice(0, 20);
};

export const getDealsOfTheDay = (): Product[] => {
  return products
    .filter(p => p.discount >= 40)
    .sort((a, b) => b.discount - a.discount)
    .slice(0, 10);
};
