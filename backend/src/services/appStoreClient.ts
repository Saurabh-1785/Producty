/**
 * ApeAI — App Store / Google Play Connector Client (Layer 1)
 *
 * Responsible for communicating with:
 *   - Apple App Store Connect API (iOS reviews)
 *   - Google Play Developer API (Android reviews)
 *
 * Environment variables:
 *   APP_STORE_KEY_ID, APP_STORE_ISSUER_ID, APP_STORE_PRIVATE_KEY
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
 *
 * This client provides:
 *   - fetchAppStoreReviews() — polls iOS reviews
 *   - fetchGooglePlayReviews() — polls Android reviews
 *   - Mock fixtures for local testing without API keys
 */

import { AppStoreReviewInput } from '../types/feedback';

// ─── Configuration ────────────────────────────────────────────

interface AppStoreConfig {
  keyId?: string;
  issuerId?: string;
  privateKey?: string;
}

interface GooglePlayConfig {
  serviceAccountJson?: string;
}

function getAppStoreConfig(): AppStoreConfig {
  return {
    keyId: process.env.APP_STORE_KEY_ID,
    issuerId: process.env.APP_STORE_ISSUER_ID,
    privateKey: process.env.APP_STORE_PRIVATE_KEY,
  };
}

function getGooglePlayConfig(): GooglePlayConfig {
  return {
    serviceAccountJson: process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON,
  };
}

// ─── Mock Fixtures (for local testing) ────────────────────────

export function getMockAppStoreReviews(): AppStoreReviewInput[] {
  return [
    {
      review_id: 'appstore-mock-001',
      title: 'Great app but crashes on export',
      content: 'Love the UI design and workflow. However, the app crashes every time I try to export a PDF on iOS 18. Please fix this ASAP.',
      author: 'ProductLover42',
      rating: 3,
      app_version: '2.4.1',
      platform: 'ios',
      country: 'US',
      review_date: new Date().toISOString(),
    },
    {
      review_id: 'appstore-mock-002',
      title: 'Best productivity app',
      content: 'This is hands down the best productivity app I have used. The AI suggestions are incredibly accurate and save me hours every week.',
      author: 'TechEnthusiast99',
      rating: 5,
      app_version: '2.4.1',
      platform: 'ios',
      country: 'UK',
      review_date: new Date().toISOString(),
    },
    {
      review_id: 'appstore-mock-003',
      title: 'Needs dark mode',
      content: 'The app is great but I need dark mode support. Using it at night is painful for my eyes. Also, the onboarding flow is confusing.',
      author: 'NightOwlDev',
      rating: 2,
      app_version: '2.3.0',
      platform: 'ios',
      country: 'DE',
      review_date: new Date().toISOString(),
    },
  ];
}

export function getMockGooglePlayReviews(): AppStoreReviewInput[] {
  return [
    {
      review_id: 'gplay-mock-001',
      title: 'Battery drain issue',
      content: 'App works great feature-wise, but it drains my battery like crazy. Background sync seems to run continuously even when the app is closed.',
      author: 'AndroidUser2024',
      rating: 2,
      app_version: '2.4.0',
      platform: 'android',
      country: 'IN',
      review_date: new Date().toISOString(),
    },
    {
      review_id: 'gplay-mock-002',
      title: 'Perfect for team collaboration',
      content: 'We use this across our entire team of 15 people. The real-time sync and notification system work flawlessly on Android.',
      author: 'TeamLeadMike',
      rating: 5,
      app_version: '2.4.0',
      platform: 'android',
      country: 'US',
      review_date: new Date().toISOString(),
    },
  ];
}

// ─── Live API Clients ─────────────────────────────────────────

/**
 * Fetches reviews from the Apple App Store Connect API.
 * Falls back to mock data if API credentials are not configured.
 */
export async function fetchAppStoreReviews(
  appId?: string,
): Promise<AppStoreReviewInput[]> {
  const config = getAppStoreConfig();

  if (!config.keyId || !config.issuerId || !config.privateKey) {
    console.info('⚠️  App Store API not configured — returning mock reviews');
    return getMockAppStoreReviews();
  }

  // TODO: Implement live App Store Connect JWT + API call
  // Reference: https://developer.apple.com/documentation/appstoreconnectapi
  console.info(`📱 Fetching App Store reviews for app: ${appId || 'default'}`);
  console.warn('🔧 Live App Store Connect API integration pending — using mocks');
  return getMockAppStoreReviews();
}

/**
 * Fetches reviews from the Google Play Developer API.
 * Falls back to mock data if service account is not configured.
 */
export async function fetchGooglePlayReviews(
  packageName?: string,
): Promise<AppStoreReviewInput[]> {
  const config = getGooglePlayConfig();

  if (!config.serviceAccountJson) {
    console.info('⚠️  Google Play API not configured — returning mock reviews');
    return getMockGooglePlayReviews();
  }

  // TODO: Implement live Google Play Developer API call
  // Reference: https://developers.google.com/android-publisher
  console.info(`🤖 Fetching Google Play reviews for: ${packageName || 'default'}`);
  console.warn('🔧 Live Google Play API integration pending — using mocks');
  return getMockGooglePlayReviews();
}
