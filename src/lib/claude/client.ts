/**
 * Claude API client wrapper for AI analysis
 * Uses Anthropic SDK with proper error handling and token tracking
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  Goal,
  JournalEntry,
  AIAnalysisInsights,
  AIAnalysisRecommendations,
  AIProgressSummary,
  KeyAchievement,
  AreaForImprovement,
  GoalProgressUpdate,
} from '@/types';

// Model configuration
const MODEL = 'claude-3-5-sonnet-20241022';
const MAX_TOKENS = 2048;

// Singleton client instance
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Response types
export interface JournalAnalysisResult {
  insights: AIAnalysisInsights;
  recommendations: AIAnalysisRecommendations;
  tokensUsed: number;
}

export interface GoalAnalysisResult {
  insights: AIAnalysisInsights;
  recommendations: AIAnalysisRecommendations;
  progressSummary: AIProgressSummary;
  tokensUsed: number;
}

export interface WeeklyInsightsResult {
  summary: string;
  keyAchievements: KeyAchievement[];
  areasForImprovement: AreaForImprovement[];
  goalProgressUpdates: GoalProgressUpdate[];
  insights: AIAnalysisInsights;
  recommendations: AIAnalysisRecommendations;
  tokensUsed: number;
}

// Error class for API failures
export class ClaudeAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRateLimited?: boolean
  ) {
    super(message);
    this.name = 'ClaudeAPIError';
  }
}

/**
 * Analyze a journal entry - returns sentiment, themes, goal alignment
 */
export async function analyzeJournalEntry(
  content: string,
  goals: Goal[],
  mood: string | null
): Promise<JournalAnalysisResult> {
  const anthropic = getClient();

  const goalsContext = goals.length > 0
    ? `User's goals:\n${goals.map(g => `- ${g.title} (${g.type}, ${g.status}, ${g.progressPercentage}% progress)`).join('\n')}`
    : 'No goals defined.';

  const moodContext = mood ? `Reported mood: ${mood}` : 'No mood reported.';

  const prompt = `Analyze this journal entry and provide insights. Respond ONLY with valid JSON.

${moodContext}

${goalsContext}

Journal entry:
"""
${content}
"""

Analyze and return JSON with this exact structure:
{
  "insights": {
    "sentiment": "positive" | "neutral" | "negative",
    "patterns": ["pattern1", "pattern2"],
    "key_themes": ["theme1", "theme2"],
    "goal_alignment": { "goalId": 0.0-1.0 }
  },
  "recommendations": {
    "suggestions": ["suggestion1", "suggestion2"],
    "action_items": ["action1", "action2"],
    "focus_areas": ["area1", "area2"]
  }
}

For goal_alignment, score 0.0-1.0 how much this entry relates to each goal. Only include goals that are mentioned or relevant.
Keep patterns, themes, suggestions to 3-5 items max. Be specific and actionable.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new ClaudeAPIError('No text response from Claude');
    }

    const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

    // Parse JSON response
    const parsed = parseJSONResponse(textContent.text);

    return {
      insights: (parsed.insights as AIAnalysisInsights) ?? { sentiment: 'neutral', patterns: [], key_themes: [] },
      recommendations: (parsed.recommendations as AIAnalysisRecommendations) ?? { suggestions: [], action_items: [], focus_areas: [] },
      tokensUsed,
    };
  } catch (error) {
    if (error instanceof ClaudeAPIError) throw error;
    if (error instanceof Anthropic.APIError) {
      throw new ClaudeAPIError(
        error.message,
        error.status,
        error.status === 429
      );
    }
    throw new ClaudeAPIError(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Analyze goal progress - returns recommendations based on related journals
 */
export async function analyzeGoalProgress(
  goal: Goal,
  relatedJournals: JournalEntry[]
): Promise<GoalAnalysisResult> {
  const anthropic = getClient();

  const journalsContext = relatedJournals.length > 0
    ? `Related journal entries (${relatedJournals.length}):\n${relatedJournals.map(j =>
        `[${j.entryDate.toISOString().split('T')[0]}] ${j.mood ? `(${j.mood})` : ''} ${j.content.slice(0, 200)}...`
      ).join('\n\n')}`
    : 'No related journal entries.';

  const daysUntilTarget = goal.targetDate
    ? Math.ceil((goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const prompt = `Analyze this goal's progress and provide recommendations. Respond ONLY with valid JSON.

Goal: ${goal.title}
Description: ${goal.description || 'No description'}
Type: ${goal.type}
Status: ${goal.status}
Progress: ${goal.progressPercentage}%
Target date: ${goal.targetDate ? goal.targetDate.toISOString().split('T')[0] : 'Not set'}${daysUntilTarget ? ` (${daysUntilTarget} days ${daysUntilTarget > 0 ? 'remaining' : 'overdue'})` : ''}
Created: ${goal.createdAt.toISOString().split('T')[0]}

${journalsContext}

Analyze and return JSON with this exact structure:
{
  "insights": {
    "patterns": ["pattern1", "pattern2"],
    "key_themes": ["theme1", "theme2"],
    "sentiment": "positive" | "neutral" | "negative"
  },
  "recommendations": {
    "suggestions": ["suggestion1", "suggestion2"],
    "action_items": ["action1", "action2"],
    "focus_areas": ["area1", "area2"]
  },
  "progress_summary": {
    "overall_progress": 0-100,
    "goals_on_track": ["reason1"],
    "goals_behind": ["reason1"],
    "momentum_score": 0-100
  }
}

Assess if the goal is on track based on progress %, time remaining, and journal activity.
momentum_score: 0-100 based on recent activity and progress rate.
Be specific about what's working and what needs attention.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new ClaudeAPIError('No text response from Claude');
    }

    const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

    const parsed = parseJSONResponse(textContent.text);

    return {
      insights: (parsed.insights as AIAnalysisInsights) ?? { sentiment: 'neutral', patterns: [], key_themes: [] },
      recommendations: (parsed.recommendations as AIAnalysisRecommendations) ?? { suggestions: [], action_items: [], focus_areas: [] },
      progressSummary: (parsed.progress_summary as AIProgressSummary) ?? { overall_progress: goal.progressPercentage, momentum_score: 50 },
      tokensUsed,
    };
  } catch (error) {
    if (error instanceof ClaudeAPIError) throw error;
    if (error instanceof Anthropic.APIError) {
      throw new ClaudeAPIError(
        error.message,
        error.status,
        error.status === 429
      );
    }
    throw new ClaudeAPIError(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate weekly/monthly insights summary
 */
export async function generateWeeklyInsights(
  journals: JournalEntry[],
  goals: Goal[],
  stats: {
    activeGoals: number;
    completedGoals: number;
    journalCount: number;
    currentStreak: number;
    avgMood?: string;
  }
): Promise<WeeklyInsightsResult> {
  const anthropic = getClient();

  const journalsContext = journals.length > 0
    ? `Journal entries this period (${journals.length}):\n${journals.map(j =>
        `[${j.entryDate.toISOString().split('T')[0]}] Mood: ${j.mood ?? 'none'}\n${j.content.slice(0, 150)}...`
      ).join('\n\n')}`
    : 'No journal entries this period.';

  const goalsContext = goals.length > 0
    ? `Goals:\n${goals.map(g =>
        `- ${g.title} (${g.type}, ${g.status}, ${g.progressPercentage}%)`
      ).join('\n')}`
    : 'No goals defined.';

  const prompt = `Generate a weekly/monthly insights summary. Respond ONLY with valid JSON.

Period stats:
- Active goals: ${stats.activeGoals}
- Completed goals: ${stats.completedGoals}
- Journal entries: ${stats.journalCount}
- Current streak: ${stats.currentStreak} days
${stats.avgMood ? `- Average mood: ${stats.avgMood}` : ''}

${goalsContext}

${journalsContext}

Generate JSON with this exact structure:
{
  "summary": "2-3 sentence overview of the period",
  "key_achievements": [
    { "title": "Achievement", "description": "Details", "goal_id": "optional-goal-id", "date": "YYYY-MM-DD" }
  ],
  "areas_for_improvement": [
    { "area": "Area name", "suggestion": "Specific suggestion", "priority": "high" | "medium" | "low" }
  ],
  "goal_progress_updates": [
    { "goal_id": "id", "goal_title": "title", "previous_progress": 0, "current_progress": 0, "change": 0, "notes": "comment" }
  ],
  "insights": {
    "patterns": ["pattern1"],
    "key_themes": ["theme1"],
    "sentiment": "positive" | "neutral" | "negative"
  },
  "recommendations": {
    "suggestions": ["suggestion1"],
    "action_items": ["action1"],
    "focus_areas": ["area1"]
  }
}

Be encouraging but honest. Focus on progress and momentum. Keep items to 3-5 max.`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new ClaudeAPIError('No text response from Claude');
    }

    const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

    const parsed = parseJSONResponse(textContent.text);

    return {
      summary: (parsed.summary as string) ?? 'No summary available.',
      keyAchievements: (parsed.key_achievements as KeyAchievement[]) ?? [],
      areasForImprovement: (parsed.areas_for_improvement as AreaForImprovement[]) ?? [],
      goalProgressUpdates: (parsed.goal_progress_updates as GoalProgressUpdate[]) ?? [],
      insights: (parsed.insights as AIAnalysisInsights) ?? { sentiment: 'neutral', patterns: [], key_themes: [] },
      recommendations: (parsed.recommendations as AIAnalysisRecommendations) ?? { suggestions: [], action_items: [], focus_areas: [] },
      tokensUsed,
    };
  } catch (error) {
    if (error instanceof ClaudeAPIError) throw error;
    if (error instanceof Anthropic.APIError) {
      throw new ClaudeAPIError(
        error.message,
        error.status,
        error.status === 429
      );
    }
    throw new ClaudeAPIError(`Claude API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse JSON from Claude response, handling markdown code blocks
 */
function parseJSONResponse(text: string): Record<string, unknown> {
  // Remove markdown code blocks if present
  let jsonStr = text.trim();

  // Handle ```json ... ``` or ``` ... ```
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  }

  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Failed to parse Claude response as JSON:', text.slice(0, 200));
    throw new ClaudeAPIError('Invalid JSON response from Claude');
  }
}
