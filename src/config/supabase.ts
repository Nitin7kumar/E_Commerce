import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Config from 'react-native-config';

// Supabase project credentials loaded from .env file
// Get these from your Supabase Dashboard > Settings > API
const SUPABASE_URL: string = Config.SUPABASE_URL || '';
const SUPABASE_ANON_KEY: string = Config.SUPABASE_ANON_KEY || '';

// Helper to check if Supabase is configured with valid credentials
export const isSupabaseConfigured = (): boolean => {
  const isUrlValid = SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
    SUPABASE_URL.includes('supabase.co');

  // Valid Supabase anon keys are JWT tokens that start with 'eyJ'
  const isKeyValid = SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY' &&
    SUPABASE_ANON_KEY.startsWith('eyJ') &&
    !SUPABASE_ANON_KEY.includes('REPLACE_WITH');

  return isUrlValid && isKeyValid;
};

// Create client only if configured, otherwise create a dummy that won't crash
let supabaseClient: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    // Fix for React Native: Disable automatic realtime connection
    // to prevent "Cannot assign to property 'protocol'" error
    global: {
      headers: {
        'X-Client-Info': 'supabase-js-react-native',
      },
    },
  });
  console.log('✅ Supabase client initialized');
} else {
  console.warn(
    '⚠️ Supabase is not properly configured. Using mock authentication.\n' +
    'To enable real authentication:\n' +
    '1. Go to your Supabase Dashboard\n' +
    '2. Navigate to Settings > API\n' +
    '3. Copy the "Project URL" and "anon public" key\n' +
    '4. Update src/config/supabase.ts with these values'
  );
}

// Export the client (may be null if not configured)
export const supabase = supabaseClient;

// Helper to get non-null supabase client (use after isSupabaseConfigured check)
export const getSupabase = (): SupabaseClient => {
  if (!supabaseClient) {
    throw new Error('Supabase is not configured. Please check your credentials in src/config/supabase.ts');
  }
  return supabaseClient;
};

// Export URL for debugging
export const getSupabaseUrl = () => SUPABASE_URL;
