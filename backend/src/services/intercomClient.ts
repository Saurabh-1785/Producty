/**
 * ApeAI — Intercom / Zendesk Connector Client (Layer 1)
 *
 * Responsible for fetching support ticket conversation histories.
 *
 * Environment variables:
 *   INTERCOM_ACCESS_TOKEN
 *   ZENDESK_SUBDOMAIN, ZENDESK_API_TOKEN, ZENDESK_EMAIL
 *
 * This client provides:
 *   - fetchIntercomConversations() — polls Intercom tickets
 *   - fetchZendeskTickets() — polls Zendesk tickets
 *   - Mock fixtures for local testing without API tokens
 */

import { SupportTicketWebhookInput } from '../types/feedback';

// ─── Configuration ────────────────────────────────────────────

interface IntercomConfig {
  accessToken?: string;
}

interface ZendeskConfig {
  subdomain?: string;
  apiToken?: string;
  email?: string;
}

function getIntercomConfig(): IntercomConfig {
  return {
    accessToken: process.env.INTERCOM_ACCESS_TOKEN,
  };
}

function getZendeskConfig(): ZendeskConfig {
  return {
    subdomain: process.env.ZENDESK_SUBDOMAIN,
    apiToken: process.env.ZENDESK_API_TOKEN,
    email: process.env.ZENDESK_EMAIL,
  };
}

// ─── Mock Fixtures ────────────────────────────────────────────

export function getMockIntercomTickets(): SupportTicketWebhookInput[] {
  return [
    {
      ticket_id: 'intercom-mock-001',
      subject: 'Cannot export reports to PDF',
      content: 'Hi, I\'ve been trying to export my weekly product report to PDF but keep getting a "generation failed" error. I\'m on the Pro plan and this feature is supposed to be included. Can you help?',
      author: 'jessica.chen@acmecorp.com',
      customer_email: 'jessica.chen@acmecorp.com',
      customer_tier: 'pro',
      tags: ['bug', 'export', 'pdf'],
      platform: 'intercom',
      created_at: new Date().toISOString(),
    },
    {
      ticket_id: 'intercom-mock-002',
      subject: 'Request for SSO integration',
      content: 'Our security team requires SSO (SAML 2.0) for all SaaS tools. Is this on your roadmap? We have 200+ users and manual provisioning is not sustainable. This is a deal-breaker for our enterprise contract renewal.',
      author: 'robert.kim@bigcorp.io',
      customer_email: 'robert.kim@bigcorp.io',
      customer_tier: 'enterprise',
      tags: ['feature-request', 'sso', 'enterprise'],
      platform: 'intercom',
      created_at: new Date().toISOString(),
    },
    {
      ticket_id: 'intercom-mock-003',
      subject: 'Slow loading times on dashboard',
      content: 'The main dashboard takes 8-10 seconds to load. This started happening after the last update. We have about 3000 feedback items in our workspace. Other pages load fine.',
      author: 'maria.santos@startupxyz.com',
      customer_email: 'maria.santos@startupxyz.com',
      customer_tier: 'free',
      tags: ['performance', 'dashboard'],
      platform: 'intercom',
      created_at: new Date().toISOString(),
    },
  ];
}

export function getMockZendeskTickets(): SupportTicketWebhookInput[] {
  return [
    {
      ticket_id: 'zendesk-mock-001',
      subject: 'API rate limiting is too aggressive',
      content: 'We\'re hitting rate limits when trying to batch-import feedback via your API. The current limit of 100 requests/minute is too low for our use case. We need to import ~5000 items daily from our CRM.',
      author: 'dev-team@techstartup.com',
      customer_email: 'dev-team@techstartup.com',
      customer_tier: 'pro',
      tags: ['api', 'rate-limit', 'integration'],
      platform: 'zendesk',
      created_at: new Date().toISOString(),
    },
  ];
}

// ─── Live API Clients ─────────────────────────────────────────

/**
 * Fetches recent conversations from Intercom.
 * Falls back to mock data if API token is not configured.
 */
export async function fetchIntercomConversations(
  limit: number = 20,
): Promise<SupportTicketWebhookInput[]> {
  const config = getIntercomConfig();

  if (!config.accessToken) {
    console.info('⚠️  Intercom API not configured — returning mock tickets');
    return getMockIntercomTickets();
  }

  // TODO: Implement live Intercom API call
  // Reference: https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Conversations/
  console.info(`💬 Fetching Intercom conversations (limit: ${limit})`);
  console.warn('🔧 Live Intercom API integration pending — using mocks');
  return getMockIntercomTickets();
}

/**
 * Fetches recent tickets from Zendesk.
 * Falls back to mock data if API credentials are not configured.
 */
export async function fetchZendeskTickets(
  limit: number = 20,
): Promise<SupportTicketWebhookInput[]> {
  const config = getZendeskConfig();

  if (!config.subdomain || !config.apiToken) {
    console.info('⚠️  Zendesk API not configured — returning mock tickets');
    return getMockZendeskTickets();
  }

  // TODO: Implement live Zendesk API call
  // Reference: https://developer.zendesk.com/api-reference/ticketing/tickets/tickets/
  console.info(`🎫 Fetching Zendesk tickets (limit: ${limit})`);
  console.warn('🔧 Live Zendesk API integration pending — using mocks');
  return getMockZendeskTickets();
}
