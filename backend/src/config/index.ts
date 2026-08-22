/**
 * ApeAI — Centralized Configuration
 *
 * Loads environment variables from the root .env file.
 * All integration credentials are optional — the app starts
 * even without Google AI configured.
 */

import path from 'path';
import dotenv from 'dotenv';

// Load from root .env (two levels above backend/)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export interface Settings {
  supabaseUrl: string;
  supabaseKey: string;
  googleApiKey: string | undefined;
  appHost: string;
  appPort: number;
  appDebug: boolean;
  supabaseConfigured: boolean;
  googleConfigured: boolean;
}

const settings: Settings = {
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseKey: process.env.SUPABASE_KEY ?? '',
  googleApiKey: process.env.GOOGLE_API_KEY || undefined,
  appHost: process.env.APP_HOST ?? '0.0.0.0',
  appPort: parseInt(process.env.APP_PORT ?? process.env.PORT ?? '8000', 10),
  appDebug: (process.env.APP_DEBUG ?? 'true') === 'true',
  get supabaseConfigured() {
    return Boolean(this.supabaseUrl && this.supabaseKey);
  },
  get googleConfigured() {
    return Boolean(this.googleApiKey);
  },
};

export default settings;
