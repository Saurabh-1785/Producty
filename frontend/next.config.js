const fs = require('fs');
const path = require('path');

// Try to load variables from the root .env file
const envPath = path.resolve(__dirname, '../.env');
const envVars = {};

if (fs.existsSync(envPath)) {
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      
      const index = trimmed.indexOf('=');
      if (index > 0) {
        const key = trimmed.substring(0, index).trim();
        const val = trimmed.substring(index + 1).trim();
        // Strip surrounding quotes
        const cleanedVal = val.replace(/^["']|["']$/g, '');
        envVars[key] = cleanedVal;
      }
    });
  } catch (err) {
    console.warn("⚠️ Failed to read root .env file:", err.message);
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || envVars.NEXT_PUBLIC_API_URL || '/api',
    NEXT_PUBLIC_SUPABASE_URL: 
      process.env.NEXT_PUBLIC_SUPABASE_URL || 
      envVars.NEXT_PUBLIC_SUPABASE_URL || 
      envVars.SUPABASE_URL || 
      '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
      envVars.SUPABASE_KEY || 
      '',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/:path*',
      },
    ]
  },
}

module.exports = nextConfig
