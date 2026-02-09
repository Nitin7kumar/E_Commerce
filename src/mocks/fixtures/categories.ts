import { Category } from '../../types';

export const categories: Category[] = [
  {
    id: 'men',
    name: 'Men',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    subcategories: [
      { id: 'men-tshirts', name: 'T-Shirts', categoryId: 'men' },
      { id: 'men-shirts', name: 'Casual Shirts', categoryId: 'men' },
      { id: 'men-formal', name: 'Formal Shirts', categoryId: 'men' },
      { id: 'men-jeans', name: 'Jeans', categoryId: 'men' },
      { id: 'men-trousers', name: 'Trousers', categoryId: 'men' },
      { id: 'men-shorts', name: 'Shorts', categoryId: 'men' },
      { id: 'men-jackets', name: 'Jackets', categoryId: 'men' },
      { id: 'men-sweaters', name: 'Sweaters', categoryId: 'men' },
      { id: 'men-activewear', name: 'Activewear', categoryId: 'men' },
      { id: 'men-innerwear', name: 'Innerwear', categoryId: 'men' },
    ],
  },
  {
    id: 'women',
    name: 'Women',
    image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200',
    subcategories: [
      { id: 'women-dresses', name: 'Dresses', categoryId: 'women' },
      { id: 'women-tops', name: 'Tops', categoryId: 'women' },
      { id: 'women-tshirts', name: 'T-Shirts', categoryId: 'women' },
      { id: 'women-jeans', name: 'Jeans', categoryId: 'women' },
      { id: 'women-kurtas', name: 'Kurtas & Suits', categoryId: 'women' },
      { id: 'women-sarees', name: 'Sarees', categoryId: 'women' },
      { id: 'women-skirts', name: 'Skirts', categoryId: 'women' },
      { id: 'women-leggings', name: 'Leggings', categoryId: 'women' },
      { id: 'women-activewear', name: 'Activewear', categoryId: 'women' },
      { id: 'women-lingerie', name: 'Lingerie', categoryId: 'women' },
    ],
  },
  {
    id: 'kids',
    name: 'Kids',
    image: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?w=200',
    subcategories: [
      { id: 'kids-boys-tshirts', name: 'Boys T-Shirts', categoryId: 'kids' },
      { id: 'kids-girls-dresses', name: 'Girls Dresses', categoryId: 'kids' },
      { id: 'kids-boys-jeans', name: 'Boys Jeans', categoryId: 'kids' },
      { id: 'kids-girls-tops', name: 'Girls Tops', categoryId: 'kids' },
      { id: 'kids-boys-shorts', name: 'Boys Shorts', categoryId: 'kids' },
      { id: 'kids-infant', name: 'Infant Wear', categoryId: 'kids' },
    ],
  },
  {
    id: 'footwear',
    name: 'Footwear',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200',
    subcategories: [
      { id: 'footwear-casual', name: 'Casual Shoes', categoryId: 'footwear' },
      { id: 'footwear-sports', name: 'Sports Shoes', categoryId: 'footwear' },
      { id: 'footwear-formal', name: 'Formal Shoes', categoryId: 'footwear' },
      { id: 'footwear-sandals', name: 'Sandals', categoryId: 'footwear' },
      { id: 'footwear-heels', name: 'Heels', categoryId: 'footwear' },
      { id: 'footwear-flats', name: 'Flats', categoryId: 'footwear' },
      { id: 'footwear-sneakers', name: 'Sneakers', categoryId: 'footwear' },
    ],
  },
  {
    id: 'accessories',
    name: 'Accessories',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200',
    subcategories: [
      { id: 'accessories-watches', name: 'Watches', categoryId: 'accessories' },
      { id: 'accessories-sunglasses', name: 'Sunglasses', categoryId: 'accessories' },
      { id: 'accessories-bags', name: 'Bags', categoryId: 'accessories' },
      { id: 'accessories-belts', name: 'Belts', categoryId: 'accessories' },
      { id: 'accessories-wallets', name: 'Wallets', categoryId: 'accessories' },
      { id: 'accessories-jewellery', name: 'Jewellery', categoryId: 'accessories' },
    ],
  },
  {
    id: 'beauty',
    name: 'Beauty',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200',
    subcategories: [
      { id: 'beauty-makeup', name: 'Makeup', categoryId: 'beauty' },
      { id: 'beauty-skincare', name: 'Skincare', categoryId: 'beauty' },
      { id: 'beauty-haircare', name: 'Haircare', categoryId: 'beauty' },
      { id: 'beauty-fragrances', name: 'Fragrances', categoryId: 'beauty' },
      { id: 'beauty-grooming', name: 'Grooming', categoryId: 'beauty' },
    ],
  },
];

export const getCategoryById = (id: string): Category | undefined => {
  return categories.find(c => c.id === id);
};

export const getSubcategoryById = (subcategoryId: string) => {
  for (const category of categories) {
    const subcategory = category.subcategories.find(s => s.id === subcategoryId);
    if (subcategory) {
      return { category, subcategory };
    }
  }
  return undefined;
};
