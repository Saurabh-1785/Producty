/**
 * ApeAI — Reddit Connector Client (Layer 1)
 *
 * Responsible for querying Reddit search & subreddit endpoints.
 *
 * Environment variables:
 *   REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USER_AGENT
 *
 * This client provides:
 *   - fetchSubredditPosts() — polls posts from a subreddit
 *   - searchRedditPosts() — keyword search across Reddit
 *   - Mock fixtures for local testing without Reddit API keys
 */

import { RedditPostInput } from '../types/feedback';

// ─── Configuration ────────────────────────────────────────────

interface RedditConfig {
  clientId?: string;
  clientSecret?: string;
  userAgent?: string;
}

function getRedditConfig(): RedditConfig {
  return {
    clientId: process.env.REDDIT_CLIENT_ID,
    clientSecret: process.env.REDDIT_CLIENT_SECRET,
    userAgent: process.env.REDDIT_USER_AGENT || 'ApeAI/1.0',
  };
}

// ─── Mock Fixtures ────────────────────────────────────────────

export function getMockRedditPosts(): RedditPostInput[] {
  return [
    {
      post_id: 'reddit-mock-001',
      title: 'Has anyone tried ApeAI for product feedback management?',
      content: 'We switched from Productboard to ApeAI last month and the AI clustering feature is incredible. It automatically groups similar feedback from different sources. The only downside is the export functionality could be better.',
      author: 'pm_sarah_k',
      subreddit: 'ProductManagement',
      upvotes: 147,
      comments_count: 32,
      post_url: 'https://reddit.com/r/ProductManagement/comments/mock001',
      created_utc: Math.floor(Date.now() / 1000) - 3600,
    },
    {
      post_id: 'reddit-mock-002',
      title: 'Feature request: Better integration with Slack for feedback collection',
      content: 'I love the product but I really wish there was a native Slack integration. Right now I have to copy-paste feedback from Slack channels into the tool manually. Would be amazing to have a /feedback slash command.',
      author: 'dev_ops_mike',
      subreddit: 'SaaS',
      upvotes: 89,
      comments_count: 15,
      post_url: 'https://reddit.com/r/SaaS/comments/mock002',
      created_utc: Math.floor(Date.now() / 1000) - 7200,
    },
    {
      post_id: 'reddit-mock-003',
      title: 'Bug report: Dashboard freezes when loading 500+ feedback items',
      content: 'Running into performance issues on the dashboard. When I have more than 500 feedback items loaded, the entire page becomes unresponsive. Using Chrome 120 on macOS. The clustering page works fine though.',
      author: 'frontend_debugger',
      subreddit: 'webdev',
      upvotes: 23,
      comments_count: 8,
      post_url: 'https://reddit.com/r/webdev/comments/mock003',
      created_utc: Math.floor(Date.now() / 1000) - 14400,
    },
  ];
}

// ─── Live API Client ──────────────────────────────────────────

/**
 * Fetches recent posts from a subreddit.
 * Falls back to mock data if Reddit API credentials are not configured.
 */
export async function fetchSubredditPosts(
  subreddit: string,
  limit: number = 25,
): Promise<RedditPostInput[]> {
  const config = getRedditConfig();

  if (!config.clientId || !config.clientSecret) {
    console.info('⚠️  Reddit API not configured — returning mock posts');
    return getMockRedditPosts();
  }

  // TODO: Implement live Reddit OAuth2 token + API call
  // Reference: https://www.reddit.com/dev/api/
  console.info(`🤖 Fetching posts from r/${subreddit} (limit: ${limit})`);
  console.warn('🔧 Live Reddit API integration pending — using mocks');
  return getMockRedditPosts();
}

/**
 * Searches Reddit for posts matching a keyword query.
 * Falls back to mock data if Reddit API credentials are not configured.
 */
export async function searchRedditPosts(
  query: string,
  subreddit?: string,
  limit: number = 25,
): Promise<RedditPostInput[]> {
  const config = getRedditConfig();

  if (!config.clientId || !config.clientSecret) {
    console.info('⚠️  Reddit API not configured — returning mock posts');
    return getMockRedditPosts();
  }

  // TODO: Implement live Reddit search API
  const scope = subreddit ? `r/${subreddit}` : 'all';
  console.info(`🔍 Searching Reddit (${scope}) for: "${query}" (limit: ${limit})`);
  console.warn('🔧 Live Reddit search integration pending — using mocks');
  return getMockRedditPosts();
}
