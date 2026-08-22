/**
 * ApeAI — Jira Payload Mapper
 *
 * Translates the universal task format into Jira REST API v3 Issue format (ADF).
 * Mirrors Python integrations/jira/mapper.py.
 */

type Task = Record<string, unknown>;

interface JiraPayload {
  fields: {
    project: { key: string };
    summary: string;
    description: {
      type: string;
      version: number;
      content: Array<Record<string, unknown>>;
    };
    issuetype: { name: string };
    priority: { name: string };
    labels: string[];
  };
}

export function mapToJira(task: Task, projectKey: string): JiraPayload {
  const priorityRaw = ((task['priority'] as string) ?? 'Medium').toLowerCase();
  let priorityName = 'Medium';
  if (priorityRaw.includes('high') || priorityRaw.includes('must')) priorityName = 'High';
  else if (priorityRaw.includes('low') || priorityRaw.includes('could')) priorityName = 'Low';

  const descriptionText = (task['description'] as string) ?? '';
  const lines = descriptionText.split('\n');

  const contentNodes: Array<Record<string, unknown>> = [];
  for (const line of lines) {
    if (line.trim()) {
      contentNodes.push({
        type: 'paragraph',
        content: [{ type: 'text', text: line }],
      });
    }
  }

  if (contentNodes.length === 0) {
    contentNodes.push({ type: 'paragraph', content: [] });
  }

  const labels = ((task['labels'] as string[]) ?? []).map((l) => l.replace(/ /g, '-'));

  return {
    fields: {
      project: { key: projectKey },
      summary: (task['title'] as string) ?? 'AI Task',
      description: {
        type: 'doc',
        version: 1,
        content: contentNodes,
      },
      issuetype: { name: 'Task' },
      priority: { name: priorityName },
      labels,
    },
  };
}
