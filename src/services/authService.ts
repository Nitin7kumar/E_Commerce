import { supabase, isSupabaseConfigured } from '../config/supabase';
import { User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Transform DB profile to app User type
const profileToUser = (profile: any): User => ({
  id: profile.id,
  name: profile.name || '',
  email: profile.email,
  phone: profile.phone || '',
  profileImage: profile.profile_image_url || undefined,
});

// ============= MOCK AUTH (used when Supabase is not configured) =============
const MOCK_USERS_KEY = '@mock_users';
const MOCK_CURRENT_USER_KEY = '@mock_current_user';

interface MockUser {
  id: string;
  email: string;
  password: string;
  name: string;
  phone?: string;
  profileImage?: string;
}

// Default demo user
const DEFAULT_MOCK_USERS: MockUser[] = [
  {
    id: 'demo-user-1',
    email: 'demo@example.com',
    password: 'password123',
    name: 'Demo User',
    phone: '1234567890',
  },
];

const mockAuthService = {
  async getUsers(): Promise<MockUser[]> {
    try {
      const stored = await AsyncStorage.getItem(MOCK_USERS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      // Initialize with default users
      await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(DEFAULT_MOCK_USERS));
      return DEFAULT_MOCK_USERS;
    } catch {
      return DEFAULT_MOCK_USERS;
    }
  },

  async saveUsers(users: MockUser[]): Promise<void> {
    await AsyncStorage.setItem(MOCK_USERS_KEY, JSON.stringify(users));
  },

  async setCurrentUser(user: User | null): Promise<void> {
    if (user) {
      await AsyncStorage.setItem(MOCK_CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(MOCK_CURRENT_USER_KEY);
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const stored = await AsyncStorage.getItem(MOCK_CURRENT_USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  mockUserToUser(mockUser: MockUser): User {
    return {
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      phone: mockUser.phone || '',
      profileImage: mockUser.profileImage,
    };
  },
};
// ============= END MOCK AUTH =============

export const authService = {
  /**
   * Sign up a new user
   */
  async signUp(data: SignUpData): Promise<AuthResult> {
    // Use mock auth when Supabase is not configured
    if (!isSupabaseConfigured() || !supabase) {
      try {
        const users = await mockAuthService.getUsers();
        
        // Check if email already exists
        if (users.find(u => u.email.toLowerCase() === data.email.toLowerCase())) {
          return { success: false, error: 'Email already registered' };
        }

        // Create new mock user
        const newUser: MockUser = {
          id: `user-${Date.now()}`,
          email: data.email.toLowerCase(),
          password: data.password,
          name: data.name,
          phone: data.phone,
        };

        users.push(newUser);
        await mockAuthService.saveUsers(users);

        const user = mockAuthService.mockUserToUser(newUser);
        await mockAuthService.setCurrentUser(user);

        return { success: true, user };
      } catch (error) {
        return { success: false, error: 'An unexpected error occurred' };
      }
    }
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            name: data.name,
          },
        },
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to create user' };
      }

      // Update profile with phone if provided
      if (data.phone) {
        await supabase
          .from('profiles')
          .update({ phone: data.phone } as any)
          .eq('id', authData.user.id);
      }

      // Fetch the created profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        return { success: true, user: profileToUser(profile) };
      }

      return {
        success: true,
        user: {
          id: authData.user.id,
          name: data.name,
          email: data.email,
          phone: data.phone || '',
        },
      };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Sign in an existing user
   */
  async signIn(data: SignInData): Promise<AuthResult> {
    // Use mock auth when Supabase is not configured
    if (!isSupabaseConfigured() || !supabase) {
      try {
        const users = await mockAuthService.getUsers();
        const mockUser = users.find(
          u => u.email.toLowerCase() === data.email.toLowerCase() && u.password === data.password
        );

        if (!mockUser) {
          return { success: false, error: 'Invalid email or password' };
        }

        const user = mockAuthService.mockUserToUser(mockUser);
        await mockAuthService.setCurrentUser(user);

        return { success: true, user };
      } catch (error) {
        return { success: false, error: 'An unexpected error occurred' };
      }
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'Failed to sign in' };
      }

      // Fetch profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      // If profile doesn't exist (edge case), create it
      if (profileError && profileError.code === 'PGRST116') {
        console.log('Profile not found, creating one...');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: authData.user.email || '',
            name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User',
          })
          .select()
          .single();

        if (createError) {
          console.error('Failed to create profile:', createError);
          return { success: false, error: 'Failed to create profile' };
        }
        profile = newProfile;
        profileError = null;
      }

      if (profileError || !profile) {
        return { success: false, error: 'Failed to fetch profile' };
      }

      return { success: true, user: profileToUser(profile) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Sign out the current user
   */
  async signOut(): Promise<{ success: boolean; error?: string }> {
    // Use mock auth when Supabase is not configured
    if (!isSupabaseConfigured() || !supabase) {
      try {
        await mockAuthService.setCurrentUser(null);
        return { success: true };
      } catch (error) {
        return { success: false, error: 'An unexpected error occurred' };
      }
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Get the current session
   */
  async getSession() {
    // Use mock auth when Supabase is not configured
    if (!isSupabaseConfigured() || !supabase) {
      const user = await mockAuthService.getCurrentUser();
      return { session: user ? { user } : null, error: null };
    }

    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<AuthResult> {
    // Use mock auth when Supabase is not configured
    if (!isSupabaseConfigured() || !supabase) {
      try {
        const user = await mockAuthService.getCurrentUser();
        if (!user) {
          return { success: false, error: 'Not authenticated' };
        }
        return { success: true, user };
      } catch (error) {
        return { success: false, error: 'An unexpected error occurred' };
      }
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        return { success: false, error: 'Not authenticated' };
      }

      let { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      // If profile doesn't exist, create it
      if (error && error.code === 'PGRST116') {
        console.log('Profile not found in getCurrentUser, creating one...');
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          })
          .select()
          .single();

        if (!createError && newProfile) {
          profile = newProfile;
          error = null;
        }
      }

      if (error || !profile) {
        return { success: false, error: 'Profile not found' };
      }

      return { success: true, user: profileToUser(profile) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(updates: { name?: string; phone?: string; profile_image_url?: string }): Promise<AuthResult> {
    // Use mock auth when Supabase is not configured
    if (!isSupabaseConfigured() || !supabase) {
      try {
        const currentUser = await mockAuthService.getCurrentUser();
        if (!currentUser) {
          return { success: false, error: 'Not authenticated' };
        }

        // Update the mock user in storage
        const users = await mockAuthService.getUsers();
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        
        if (userIndex !== -1) {
          if (updates.name) users[userIndex].name = updates.name;
          if (updates.phone) users[userIndex].phone = updates.phone;
          if (updates.profile_image_url) users[userIndex].profileImage = updates.profile_image_url;
          await mockAuthService.saveUsers(users);
        }

        const updatedUser: User = {
          ...currentUser,
          name: updates.name || currentUser.name,
          phone: updates.phone || currentUser.phone,
          profileImage: updates.profile_image_url || currentUser.profileImage,
        };
        await mockAuthService.setCurrentUser(updatedUser);

        return { success: true, user: updatedUser };
      } catch (error) {
        return { success: false, error: 'An unexpected error occurred' };
      }
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        return { success: false, error: 'Not authenticated' };
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .update(updates as any)
        .eq('id', authUser.id)
        .select()
        .single();

      if (error || !profile) {
        return { success: false, error: error?.message || 'Failed to update profile' };
      }

      return { success: true, user: profileToUser(profile) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Reset password
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    // Use mock auth when Supabase is not configured
    if (!isSupabaseConfigured() || !supabase) {
      // Mock password reset - just return success
      return { success: true };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  /**
   * Listen to auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!supabase) {
      // Return a dummy subscription that does nothing
      return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange(callback);
  },
};
