/**
 * ApeAI — Jira Integration Client
 *
 * Publishes the universal task to Jira Cloud as a new Issue.
 * Mirrors Python integrations/jira/client.py.
 */

import { mapToJira } from './mapper';

type Task = Record<string, unknown>;
type Integration = Record<string, unknown>;

export async function publishToJira(
  task: Task,
  integration: Integration,
): Promise<{ external_id: string; external_url: string; external_status: string }> {
  const apiKey = integration['api_key'] as string;
  const projectKey = integration['project_id'] as string;
  const apiUrl = integration['api_url'] as string;
  const config = (integration['config'] ?? {}) as Record<string, unknown>;
  const email = config['email'] as string | undefined;

  if (!apiKey) throw new Error('Jira API Token (API Key) is missing');
  if (!projectKey) throw new Error('Jira Project Key (Project ID) is missing');
  if (!apiUrl) throw new Error('Jira Cloud Instance URL (API URL) is missing');
  if (!email) throw new Error('Jira user email is missing from integration configuration (config.email)');

  const payload = mapToJira(task, projectKey);
  const url = `${apiUrl.replace(/\/$/, '')}/rest/api/3/issue`;

  // Dry run support
  if (config['dry_run'] === true) {
    console.info(`[Jira Dry Run] Would publish issue to ${url}:`, payload);
    return {
      external_id: `${projectKey}-101`,
      external_url: `${apiUrl.replace(/\/$/, '')}/browse/${projectKey}-101`,
      external_status: 'To Do',
    };
  }

  // Basic Auth: email + API token
  const credentials = Buffer.from(`${email}:${apiKey}`).toString('base64');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Jira API Error: ${response.status} - ${errText}`);
    throw new Error(`Failed to create Jira issue: ${errText}`);
  }

  const data = (await response.json()) as Record<string, string>;
  const externalId = data['key'];
  const externalUrl = `${apiUrl.replace(/\/$/, '')}/browse/${externalId}`;

  return {
    external_id: externalId,
    external_url: externalUrl,
    external_status: 'To Do',
  };
}
