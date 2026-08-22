/**
 * ApeAI — Prompt Templates for AI Pipeline
 *
 * Direct port of Python ai/prompts/templates.py.
 * All prompts are string templates with {placeholder} substitution.
 */

export const CLUSTER_SUMMARY_PROMPT = `
You are a senior product researcher. You will be provided with a collection of user feedback items that have been grouped into a cluster.
Your task is to analyze these items and provide a high-level summary and a descriptive title for the cluster.

STRICT JSON OUTPUT FORMAT:
{{
    "title": "Short descriptive title (max 10 words)",
    "summary": "2-3 sentence summary of the core issue or request",
    "theme": "bug | feature_request | usability | performance | other",
    "priority": "low | medium | high",
    "key_points": ["point 1", "point 2", "point 3"]
}}

FEEDBACK ITEMS:
{feedback_text}
`;

export const BRD_PROMPT = `
You are a senior product manager. Based on the following cluster summary, generate a Business Requirements Document (BRD).
The BRD should focus on the business value, goals, and high-level requirements.

STRICT JSON OUTPUT FORMAT:
{{
    "title": "Business Requirements Document: [Topic]",
    "problem_statement": "Detailed description of the business problem",
    "business_impact": "Impact of this problem on the business (retention, revenue, etc.)",
    "goals": ["Goal 1", "Goal 2"],
    "target_stakeholders": ["Stakeholder 1", "Stakeholder 2"],
    "success_metrics": ["Metric 1", "Metric 2"]
}}

CLUSTER SUMMARY:
{cluster_summary}
`;

export const PRD_PROMPT = `
You are a technical product manager. Based on the BRD below, generate a Product Requirements Document (PRD).
The PRD should be technical and implementation-focused.

STRICT JSON OUTPUT FORMAT:
{{
    "title": "Product Requirements Document: [Topic]",
    "user_flows": ["Flow 1", "Flow 2"],
    "functional_requirements": ["Requirement 1", "Requirement 2"],
    "non_functional_requirements": ["Requirement 1", "Requirement 2"],
    "technical_constraints": ["Constraint 1", "Constraint 2"],
    "milestones": ["Milestone 1", "Milestone 2"]
}}

BRD CONTENT:
{brd_content}
`;

export const STORY_PROMPT = `
You are an Agile PM. Based on the PRD provided, generate a set of Agile User Stories.
Each story must follow the "As a... I want... so that..." format and include acceptance criteria.

STRICT JSON OUTPUT FORMAT:
[
    {{
        "title": "User Story Title",
        "user_role": "As a [role]",
        "requirement": "I want to [action]",
        "benefit": "so that [value]",
        "acceptance_criteria": ["Criteria 1", "Criteria 2"],
        "priority": "Must Have | Should Have | Could Have"
    }}
]

PRD CONTENT:
{prd_content}
`;

export const TASK_PROMPT = `
You are a senior software engineer. Break down the following User Story into specific technical tasks.

STRICT JSON OUTPUT FORMAT:
{{
    "story_title": "Title of the story",
    "frontend_tasks": ["Task 1", "Task 2"],
    "backend_tasks": ["Task 1", "Task 2"],
    "testing_tasks": ["Task 1", "Task 2"],
    "estimated_complexity": "Small | Medium | Large",
    "dependencies": ["Dependency 1"]
}}

USER STORY:
{story_content}
`;

/** Replace {placeholder} tokens in a prompt template */
export function formatPrompt(template: string, vars: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}
