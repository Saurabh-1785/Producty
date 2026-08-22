/**
 * ApeAI — Generation Service
 *
 * Orchestrates Gemini AI to generate structured product documents.
 * Mirrors Python ai/services/generation_service.py.
 */

import {
  CLUSTER_SUMMARY_PROMPT,
  BRD_PROMPT,
  PRD_PROMPT,
  STORY_PROMPT,
  TASK_PROMPT,
  formatPrompt,
} from './prompts';
import { geminiClient } from './geminiClient';
import { getCluster, updateCluster } from '../services/clusterService';
import { createDocument, getDocument } from '../services/documentService';

type DbRow = Record<string, unknown>;

export async function summarizeCluster(clusterId: string): Promise<DbRow> {
  const cluster = await getCluster(clusterId, true);
  const feedbackItems = (cluster['feedback_items'] ?? []) as DbRow[];

  if (feedbackItems.length === 0) throw new Error('No feedback items found in cluster');

  const feedbackText = feedbackItems
    .map((f) => `- ${f['content']} (Source: ${f['source']})`)
    .join('\n');

  const prompt = formatPrompt(CLUSTER_SUMMARY_PROMPT, { feedback_text: feedbackText });

  const model = geminiClient.getModel('flash', true);
  const response = await model.generateContent(prompt);
  const data = JSON.parse(response.response.text()) as DbRow;

  await updateCluster(clusterId, {
    title: data['title'] as string,
    summary: data['summary'] as string,
    status: 'clustered',
    confidenceScore: 95.0,
  });

  return data;
}

export async function generateBrd(clusterId: string): Promise<DbRow> {
  const cluster = await getCluster(clusterId, false);
  const summary = cluster['summary'] as string | undefined;

  if (!summary) throw new Error('Cluster must be summarized before generating BRD');

  const prompt = formatPrompt(BRD_PROMPT, { cluster_summary: summary });

  const model = geminiClient.getModel('pro', true);
  const response = await model.generateContent(prompt);
  const data = JSON.parse(response.response.text()) as DbRow;

  const doc = await createDocument({
    clusterId,
    docType: 'brd',
    title: data['title'] as string,
    content: data,
  });

  await updateCluster(clusterId, { status: 'brd_generated' });
  return doc;
}

export async function generatePrd(clusterId: string, brdId: string): Promise<DbRow> {
  const brd = await getDocument(brdId);

  const prompt = formatPrompt(PRD_PROMPT, {
    brd_content: JSON.stringify(brd['content']),
  });

  const model = geminiClient.getModel('pro', true);
  const response = await model.generateContent(prompt);
  const data = JSON.parse(response.response.text()) as DbRow;

  const doc = await createDocument({
    clusterId,
    docType: 'prd',
    title: data['title'] as string,
    content: data,
    parentId: brdId,
  });

  await updateCluster(clusterId, { status: 'prd_generated' });
  return doc;
}

export async function generateStories(clusterId: string, prdId: string): Promise<DbRow[]> {
  const prd = await getDocument(prdId);

  const prompt = formatPrompt(STORY_PROMPT, {
    prd_content: JSON.stringify(prd['content']),
  });

  const model = geminiClient.getModel('pro', true);
  const response = await model.generateContent(prompt);
  const storiesData = JSON.parse(response.response.text()) as DbRow[];

  const createdStories: DbRow[] = [];
  for (const story of storiesData) {
    const doc = await createDocument({
      clusterId,
      docType: 'story',
      title: story['title'] as string,
      content: story,
      parentId: prdId,
    });
    createdStories.push(doc);
  }

  await updateCluster(clusterId, { status: 'stories_generated' });
  return createdStories;
}

export async function generateTasks(clusterId: string, storyId: string): Promise<DbRow> {
  const story = await getDocument(storyId);

  const prompt = formatPrompt(TASK_PROMPT, {
    story_content: JSON.stringify(story['content']),
  });

  const model = geminiClient.getModel('flash', true);
  const response = await model.generateContent(prompt);
  const data = JSON.parse(response.response.text()) as DbRow;

  const doc = await createDocument({
    clusterId,
    docType: 'task',
    title: `Technical Tasks: ${story['title']}`,
    content: data,
    parentId: storyId,
  });

  return doc;
}
