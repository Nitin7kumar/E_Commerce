import { Banner } from '../../types';

export const banners: Banner[] = [
  {
    id: 'banner-1',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800',
    title: 'End of Season Sale',
    subtitle: 'Up to 70% Off',
    categoryId: 'women',
  },
  {
    id: 'banner-2',
    image: 'https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=800',
    title: 'New Arrivals',
    subtitle: 'Fresh Styles for the Season',
    categoryId: 'men',
  },
  {
    id: 'banner-3',
    image: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800',
    title: 'Trending Now',
    subtitle: 'Shop the Latest Fashion',
  },
  {
    id: 'banner-4',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800',
    title: 'Premium Brands',
    subtitle: 'Flat 50% Off',
    categoryId: 'accessories',
  },
  {
    id: 'banner-5',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
    title: 'Winter Collection',
    subtitle: 'Stay Warm in Style',
    categoryId: 'women',
  },
];

export const homeBanners = banners.slice(0, 3);
export const promoBanners = banners.slice(3);
