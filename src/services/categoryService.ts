/**
 * Category Service - Supabase Integration
 * 
 * Fetches hierarchical categories from the categories table.
 * Supports parent-child relationships for navigation.
 */

import { getSupabase, isSupabaseConfigured } from '../config/supabase';
import { useState, useEffect, useCallback } from 'react';

// =====================================================
// TYPES
// =====================================================

export interface DBCategory {
    id: string;
    parent_id: string | null;
    name: string;
    slug: string;
    description: string | null;
    image_url: string | null;
    level: number;
    display_order: number;
    path: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface CategoryWithChildren extends DBCategory {
    children: CategoryWithChildren[];
}

export interface CategoriesResult {
    categories: CategoryWithChildren[];
    error?: string;
}

// =====================================================
// CATEGORY SERVICE
// =====================================================

export const categoryService = {
    /**
     * Get all categories organized hierarchically
     */
    async getCategories(): Promise<CategoriesResult> {
        if (!isSupabaseConfigured()) {
            return { categories: [], error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true })
                .order('name', { ascending: true });

            if (error) {
                return { categories: [], error: error.message };
            }

            // Build hierarchical tree
            const categoriesTree = this.buildCategoryTree(data || []);
            return { categories: categoriesTree };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { categories: [], error: message };
        }
    },

    /**
     * Get root-level categories only (for home screen)
     */
    async getRootCategories(): Promise<CategoriesResult> {
        if (!isSupabaseConfigured()) {
            return { categories: [], error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('is_active', true)
                .is('parent_id', null)
                .order('display_order', { ascending: true })
                .order('name', { ascending: true });

            if (error) {
                return { categories: [], error: error.message };
            }

            // Return as CategoryWithChildren with empty children array
            const rootCategories: CategoryWithChildren[] = (data || []).map(c => ({
                ...c,
                children: [],
            }));

            return { categories: rootCategories };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { categories: [], error: message };
        }
    },

    /**
     * Get sub-categories for a parent category
     */
    async getSubCategories(parentId: string): Promise<CategoriesResult> {
        if (!isSupabaseConfigured()) {
            return { categories: [], error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('is_active', true)
                .eq('parent_id', parentId)
                .order('display_order', { ascending: true })
                .order('name', { ascending: true });

            if (error) {
                return { categories: [], error: error.message };
            }

            const subCategories: CategoryWithChildren[] = (data || []).map(c => ({
                ...c,
                children: [],
            }));

            return { categories: subCategories };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { categories: [], error: message };
        }
    },

    /**
     * Get a single category by ID
     */
    async getCategoryById(categoryId: string): Promise<{ category?: CategoryWithChildren; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('id', categoryId)
                .eq('is_active', true)
                .single();

            if (error) {
                return { error: error.message };
            }

            // Also fetch children for this category
            const { categories: children } = await this.getSubCategories(categoryId);

            return {
                category: {
                    ...data,
                    children,
                }
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { error: message };
        }
    },

    /**
     * Get category by slug
     */
    async getCategoryBySlug(slug: string): Promise<{ category?: CategoryWithChildren; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();

            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .eq('slug', slug)
                .eq('is_active', true)
                .single();

            if (error) {
                return { error: error.message };
            }

            // Also fetch children for this category
            const { categories: children } = await this.getSubCategories(data.id);

            return {
                category: {
                    ...data,
                    children,
                }
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { error: message };
        }
    },

    /**
     * Build a hierarchical tree from flat category list
     */
    buildCategoryTree(categories: DBCategory[]): CategoryWithChildren[] {
        const categoryMap = new Map<string, CategoryWithChildren>();
        const rootCategories: CategoryWithChildren[] = [];

        // First pass: create all nodes
        categories.forEach(category => {
            categoryMap.set(category.id, {
                ...category,
                children: [],
            });
        });

        // Second pass: build tree structure
        categories.forEach(category => {
            const node = categoryMap.get(category.id)!;

            if (category.parent_id && categoryMap.has(category.parent_id)) {
                categoryMap.get(category.parent_id)!.children.push(node);
            } else {
                rootCategories.push(node);
            }
        });

        return rootCategories;
    },

    /**
     * Get breadcrumb path for a category
     */
    async getCategoryPath(categoryId: string): Promise<{ path: DBCategory[]; error?: string }> {
        if (!isSupabaseConfigured()) {
            return { path: [], error: 'Supabase not configured' };
        }

        try {
            const supabase = getSupabase();
            const path: DBCategory[] = [];
            let currentId: string | null = categoryId;

            while (currentId) {
                const { data, error }: { data: DBCategory | null; error: any } = await supabase
                    .from('categories')
                    .select('*')
                    .eq('id', currentId)
                    .single();

                if (error || !data) break;

                path.unshift(data);
                currentId = data.parent_id;
            }

            return { path };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            return { path: [], error: message };
        }
    },
};

// =====================================================
// HOOKS
// =====================================================

export function useCategories() {
    const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);

        const result = await categoryService.getCategories();

        setCategories(result.categories);
        setError(result.error || null);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    return { categories, loading, error, refetch: fetchCategories };
}

export function useRootCategories() {
    const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        setError(null);

        const result = await categoryService.getRootCategories();

        setCategories(result.categories);
        setError(result.error || null);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    return { categories, loading, error, refetch: fetchCategories };
}

export function useSubCategories(parentId: string) {
    const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = useCallback(async () => {
        if (!parentId) {
            setCategories([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const result = await categoryService.getSubCategories(parentId);

        setCategories(result.categories);
        setError(result.error || null);
        setLoading(false);
    }, [parentId]);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    return { categories, loading, error, refetch: fetchCategories };
}

export function useCategory(categoryId: string) {
    const [category, setCategory] = useState<CategoryWithChildren | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCategory = useCallback(async () => {
        if (!categoryId) {
            setCategory(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const result = await categoryService.getCategoryById(categoryId);

        setCategory(result.category || null);
        setError(result.error || null);
        setLoading(false);
    }, [categoryId]);

    useEffect(() => {
        fetchCategory();
    }, [fetchCategory]);

    return { category, loading, error, refetch: fetchCategory };
}
