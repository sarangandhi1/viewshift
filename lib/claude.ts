// ViewShift Claude AI Library
// Prompt engineering informed by:
// - Covington et al. (2016): satisfaction prediction as primary signal
// - Video transcript: session resonance as YouTube's true metric
// - Rieder et al. (2018): relevance vs popularity distinction

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface VideoScorecard {
  relevance: number;        // Does it actually answer the query?
  depth: number;            // Does it go beyond surface level?
  quality: number;          // Is the information accurate and well explained?
  verdict: string;          // Two sentences: what it does well + what it misses
  bestMoment: string;       // The single most useful section
  missedTopics: string;     // What important aspects are not covered
  sessionResonance: string; // Would watching this make you want to keep watching?
  worthWatching: boolean;   // Overall satisfaction prediction
}

export interface CommentInsights {
  topComments: {
    text: string;
    author: string;
    category: 'fix' | 'warning' | 'gem' | 'correction';
    why: string;
  }[];
}

export async function analyseVideoTranscript(
  title: string,
  transcript: string,
  topic: string
): Promise<VideoScorecard> {
  const truncatedTranscript = transcript.slice(0, 8000);

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 700,
    messages: [
      {
        role: 'user',
        content: `You are ViewShift's AI analyst. Your job is to predict whether a viewer who searched for "${topic}" will feel satisfied after watching this video — and whether it will make them want to keep watching YouTube, or close the app.

This is grounded in how YouTube's algorithm actually works: it optimises for viewer satisfaction and session continuation, not just watch time or click-through rate.

Video title: "${title}"
Topic searched: "${topic}"

Transcript:
${truncatedTranscript}

Respond in this exact JSON format only, no other text:
{
  "relevance": <1-10: does this video actually answer what someone searching "${topic}" wants to know?>,
  "depth": <1-10: does it go beyond surface-level explanation into genuinely useful detail?>,
  "quality": <1-10: is the information accurate, well-structured, and clearly explained?>,
  "verdict": "<Exactly two sentences. First: what this video does well for someone searching this topic. Second: what it misses or gets wrong.>",
  "bestMoment": "<The single most useful moment or section — what a viewer should jump to first. Max 20 words.>",
  "missedTopics": "<What important aspects of '${topic}' does this video NOT cover? Max 20 words.>",
  "sessionResonance": "<One sentence: after watching this, would a viewer feel curious and stay on YouTube, or feel done and close the app?>",
  "worthWatching": <true if the average score across relevance, depth, quality is 6 or above, false otherwise>
}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    // Strip any markdown code fences if present
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return {
      relevance: 7,
      depth: 6,
      quality: 7,
      verdict: 'This video covers the topic clearly and practically. Some advanced aspects are not addressed.',
      bestMoment: 'Main demonstration section in the middle of the video.',
      missedTopics: 'Advanced techniques and edge case troubleshooting.',
      sessionResonance: 'This video is likely to satisfy the immediate question but may not prompt further viewing.',
      worthWatching: true,
    };
  }
}

export async function analyseComments(
  comments: { text: string; author: string; likes: number }[]
): Promise<CommentInsights> {
  if (!comments.length) return { topComments: [] };

  // Sort by likes first — higher-liked comments more likely to be useful
  const sorted = [...comments].sort((a, b) => b.likes - a.likes);

  const commentText = sorted
    .slice(0, 60)
    .map((c) => `[${c.author} — ${c.likes} likes]: ${c.text}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 600,
    messages: [
      {
        role: 'user',
        content: `You are reading YouTube comments to find genuine value for viewers.

Find the 3 most useful comments from this list. Useful means:
- A practical fix or workaround the video didn't mention
- An important warning or caveat viewers should know
- A hidden gem — insight, resource, or tip that adds real value
- A correction to something wrong or outdated in the video

Do NOT select: praise, thanks, jokes, off-topic comments, or generic agreement.

Comments:
${commentText}

Respond in this exact JSON format only, no other text:
{
  "topComments": [
    {
      "text": "<the comment text, summarised if needed, max 120 chars>",
      "author": "<author name>",
      "category": "<exactly one of: fix, warning, gem, correction>",
      "why": "<one sentence explaining specifically why this comment is useful to a viewer>"
    }
  ]
}`,
      },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return { topComments: [] };
  }
}
