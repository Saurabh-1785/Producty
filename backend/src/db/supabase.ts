/**
 * ApeAI — Supabase Client
 *
 * Creates a singleton Supabase client for database operations.
 * Fails gracefully with a clear error if credentials are missing.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import settings from '../config';

let _supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_supabaseClient) return _supabaseClient;

  if (!settings.supabaseConfigured) {
    throw new RuntimeError(
      'Supabase is not configured. Please set SUPABASE_URL and SUPABASE_KEY in your .env file.',
    );
  }

  try {
    _supabaseClient = createClient(settings.supabaseUrl, settings.supabaseKey);
    console.info('✅ Supabase client initialized successfully');
    return _supabaseClient;
  } catch (err) {
    throw new RuntimeError(`Failed to connect to Supabase: ${err}`);
  }
}

export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    await client.from('feedback').select('id').limit(1);
    return true;
  } catch {
    return false;
  }
}

/** Typed runtime error to distinguish from DB errors */
export class RuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeError';
  }
}
