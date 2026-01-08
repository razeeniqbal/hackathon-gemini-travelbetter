import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Create Supabase client with TypeScript types
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Helper function to handle Supabase errors
export function handleSupabaseError(error: any, context: string = 'Operation') {
  console.error(`${context} failed:`, error);

  if (error.message) {
    return error.message;
  }

  return `${context} failed. Please try again.`;
}
