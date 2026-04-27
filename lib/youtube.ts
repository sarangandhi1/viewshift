// ViewShift YouTube Library
// VS Score algorithm informed by:
// - Covington et al. (2016) "Deep Neural Networks for YouTube Recommendations"
// - Rieder et al. (2018) "From ranking algorithms to ranking cultures"
// - YouTube 2026 matching system analysis

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export interface VideoResult {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  views: string;
  duration: string;
  published: string;
  description: string;
  vsScore: number;
  vsSignals: {
    semanticMatch: number;
    demandSupplyGap: number;
    satisfactionProxy: number;
    recencyRelevance: number;
    hiddenGem: boolean;
  };
}

function formatViews(views: string): string {
  const n = parseInt(views);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return views;
}

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = match[1] ? `${match[1]}:` : '';
  const m = match[2] ? match[2].padStart(h ? 2 : 1, '0') : '0';
  const s = match[3] ? match[3].padStart(2, '0') : '00';
  return `${h}${m}:${s}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function parseDurationToSeconds(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (
    parseInt(match[1] || '0') * 3600 +
    parseInt(match[2] || '0') * 60 +
    parseInt(match[3] || '0')
  );
}

// ── ViewShift VS Score ───────────────────────────────────────────────────────
// Implements Rieder's two-stage model. Stage 1 = YouTube API retrieval.
// Stage 2 = ViewShift reranking on relevance, not popularity.
//
// Key insight: YouTube is a MATCHING system, not a ranking system.
// A video wins when it is the best answer to an underserved viewer need.
// Views are an OUTPUT of the system, never an input to quality.

function calculateVSScore(
  title: string,
  description: string,
  query: string,
  viewCount: string,
  likeCount: string,
  commentCount: string,
  publishedAt: string,
  durationSeconds: number,
  positionInYouTubeResults: number
): {
  score: number;
  signals: VideoResult['vsSignals'];
} {
  const views = parseInt(viewCount || '0');
  const likes = parseInt(likeCount || '0');
  const comments = parseInt(commentCount || '0');
  const daysOld = Math.floor(
    (Date.now() - new Date(publishedAt).getTime()) / 86400000
  );

  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const titleLower = title.toLowerCase();
  const descLower = (description || '').toLowerCase();

  // Signal 1: Semantic Match (0-30pts)
  // Approximates Covington's semantic fingerprint matching.
  let semanticMatch = 0;
  if (titleLower.includes(query.toLowerCase())) semanticMatch += 15;
  const titleHits = queryWords.filter((w) => titleLower.includes(w)).length;
  semanticMatch += Math.round((titleHits / Math.max(queryWords.length, 1)) * 10);
  const descHits = queryWords.filter((w) => descLower.includes(w)).length;
  semanticMatch += Math.round((descHits / Math.max(queryWords.length, 1)) * 5);
  semanticMatch = Math.min(35, semanticMatch);

  // Signal 2: Demand-Supply Gap (0-25pts)
  // Videos explode when demand is high and supply of good answers is low.
  // YouTube ranking it highly = demand detected. Low views = supply gap open.
  let demandSupplyGap = 0;
  demandSupplyGap += Math.max(0, Math.round(15 - positionInYouTubeResults * 1.5));
  if (views < 5000) demandSupplyGap += 10;
  else if (views < 20000) demandSupplyGap += 7;
  else if (views < 100000) demandSupplyGap += 4;
  else if (views < 500000) demandSupplyGap += 1;
  demandSupplyGap = Math.min(30, demandSupplyGap);

  // Signal 3: Satisfaction Proxy (0-25pts)
  // Covington: satisfaction is the primary optimisation target.
  // Approximated via engagement rate and duration fit.
  let satisfactionProxy = 0;
  if (views > 0) {
    const likeRate = likes / views;
    const commentRate = comments / views;
    if (likeRate > 0.05) satisfactionProxy += 10;
    else if (likeRate > 0.02) satisfactionProxy += 7;
    else if (likeRate > 0.01) satisfactionProxy += 4;
    else if (likeRate > 0.005) satisfactionProxy += 2;
    if (commentRate > 0.01) satisfactionProxy += 8;
    else if (commentRate > 0.005) satisfactionProxy += 5;
    else if (commentRate > 0.001) satisfactionProxy += 2;
  }
  // Duration fit: 3-15 mins optimal for most informational queries
  if (durationSeconds >= 180 && durationSeconds <= 900) satisfactionProxy += 7;
  else if (durationSeconds >= 90 && durationSeconds <= 1800) satisfactionProxy += 4;
  else if (durationSeconds >= 1800) satisfactionProxy += 2;
  satisfactionProxy = Math.min(25, satisfactionProxy);

  // Signal 4: Recency Relevance (0-10pts)
  let recencyRelevance = 0;
  if (daysOld < 30) recencyRelevance = 10;
  else if (daysOld < 90) recencyRelevance = 8;
  else if (daysOld < 180) recencyRelevance = 6;
  else if (daysOld < 365) recencyRelevance = 4;
  else if (daysOld < 730) recencyRelevance = 2;
  else recencyRelevance = 1;

  // Hidden Gem: strong semantic match + supply gap still open
  const hiddenGem = semanticMatch >= 20 && views < 50000 && satisfactionProxy >= 8;

  const score = Math.min(99, Math.max(1,
    semanticMatch + demandSupplyGap + satisfactionProxy + recencyRelevance + 20
  ));

  return {
    score,
    signals: { semanticMatch, demandSupplyGap, satisfactionProxy, recencyRelevance, hiddenGem },
  };
}

export async function searchYouTube(query: string): Promise<VideoResult[]> {
  if (!YOUTUBE_API_KEY) throw new Error('YouTube API key not configured');

  const searchRes = await fetch(
    `${BASE_URL}/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=20&relevanceLanguage=en&key=${YOUTUBE_API_KEY}`
  );
  const searchData = await searchRes.json();
  if (!searchData.items?.length) return [];

  const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

  const detailsRes = await fetch(
    `${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${YOUTUBE_API_KEY}`
  );
  const detailsData = await detailsRes.json();
  if (!detailsData.items?.length) return [];

  const results: VideoResult[] = detailsData.items.map((item: any, index: number) => {
    const stats = item.statistics || {};
    const snippet = item.snippet || {};
    const durationSeconds = parseDurationToSeconds(item.contentDetails?.duration || '');

    const { score, signals } = calculateVSScore(
      snippet.title || '',
      snippet.description || '',
      query,
      stats.viewCount || '0',
      stats.likeCount || '0',
      stats.commentCount || '0',
      snippet.publishedAt || '',
      durationSeconds,
      index
    );

    return {
      id: item.id,
      title: snippet.title || 'Untitled',
      channel: snippet.channelTitle || 'Unknown',
      thumbnail: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '',
      views: formatViews(stats.viewCount || '0'),
      duration: formatDuration(item.contentDetails?.duration || ''),
      published: formatDate(snippet.publishedAt || ''),
      description: (snippet.description || '').slice(0, 200),
      vsScore: score,
      vsSignals: signals,
    };
  });

  return results.sort((a, b) => b.vsScore - a.vsScore);
}

export async function getVideoDetails(videoId: string) {
  if (!YOUTUBE_API_KEY) throw new Error('YouTube API key not configured');

  const res = await fetch(
    `${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
  );
  const data = await res.json();
  if (!data.items?.length) return null;

  const item = data.items[0];
  const stats = item.statistics || {};
  const snippet = item.snippet || {};

  return {
    id: item.id,
    title: snippet.title || 'Untitled',
    channel: snippet.channelTitle || 'Unknown',
    thumbnail: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || '',
    views: formatViews(stats.viewCount || '0'),
    duration: formatDuration(item.contentDetails?.duration || ''),
    published: formatDate(snippet.publishedAt || ''),
    description: snippet.description || '',
    viewCount: parseInt(stats.viewCount || '0'),
    likeCount: parseInt(stats.likeCount || '0'),
    commentCount: parseInt(stats.commentCount || '0'),
  };
}

export async function getVideoComments(videoId: string) {
  if (!YOUTUBE_API_KEY) throw new Error('YouTube API key not configured');
  try {
    const res = await fetch(
      `${BASE_URL}/commentThreads?part=snippet&videoId=${videoId}&maxResults=50&order=relevance&key=${YOUTUBE_API_KEY}`
    );
    const data = await res.json();
    if (!data.items?.length) return [];
    return data.items.map((item: any) => ({
      text: item.snippet?.topLevelComment?.snippet?.textDisplay || '',
      likes: item.snippet?.topLevelComment?.snippet?.likeCount || 0,
      author: item.snippet?.topLevelComment?.snippet?.authorDisplayName || '',
    }));
  } catch {
    return [];
  }
}
