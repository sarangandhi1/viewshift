'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface ScoreCard {
  relevance: number;
  depth: number;
  quality: number;
  verdict: string;
  bestMoment: string;
  missedTopics: string;
  worthWatching: boolean;
}

interface Comment {
  text: string;
  author: string;
  category: 'fix' | 'warning' | 'gem' | 'correction';
  why: string;
}

interface VideoData {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  views: string;
  duration: string;
  published: string;
  description: string;
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const colour = score >= 8 ? '#22c55e' : score >= 6 ? '#6C63FF' : '#f59e0b';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={colour} strokeWidth="3"
            strokeDasharray={`${score * 10} 100`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{score}</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const styles: Record<string, string> = {
    fix: 'bg-green-100 text-green-700',
    warning: 'bg-amber-100 text-amber-700',
    gem: 'bg-purple-100 text-purple-700',
    correction: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    fix: '🔧 Fix',
    warning: '⚠️ Warning',
    gem: '💎 Hidden Gem',
    correction: '✏️ Correction',
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${styles[category]}`}>
      {labels[category]}
    </span>
  );
}

function AnalysePage() {
  const searchParams = useSearchParams();
  const videoId = searchParams.get('v');
  const topic = searchParams.get('topic') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [video, setVideo] = useState<VideoData | null>(null);
  const [scorecard, setScorecard] = useState<ScoreCard | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    if (!videoId) return;
    fetch(`/api/analyse?v=${videoId}&topic=${encodeURIComponent(topic)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setVideo(data.video);
        setScorecard(data.scorecard);
        setComments(data.commentInsights?.topComments || []);
        setTimeout(() => setShowEmail(true), 3000);
      })
      .catch(() => setError('Something went wrong. Please try again.'))
      .finally(() => setLoading(false));
  }, [videoId, topic]);

  if (!videoId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">
          No video selected.{' '}
          <a href="/" className="text-[#6C63FF]">Go back to search.</a>
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6C63FF" />
                <stop offset="100%" stopColor="#00D4FF" />
              </linearGradient>
            </defs>
            <path d="M5,35 Q25,8 50,35 Q25,62 5,35Z" fill="none" stroke="#6C63FF" strokeWidth="2.5" opacity="0.28" />
            <path d="M15,35 Q35,10 60,35 Q35,60 15,35Z" fill="none" stroke="url(#hg)" strokeWidth="2.8" />
            <circle cx="37" cy="35" r="10" fill="url(#hg)" />
            <circle cx="37" cy="35" r="4.5" fill="white" />
            <path d="M50,26 L60,26 L60,20 L70,32 L60,44 L60,38 L50,38Z" fill="url(#hg)" />
          </svg>
          <span className="font-bold text-lg text-gray-900">
            View<span className="text-[#6C63FF]">Shift</span>
          </span>
        </a>
        <a href="/" className="text-sm text-gray-500 hover:text-gray-900">
          ← Back to search
        </a>
      </header>

      {loading ? (
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
            <div className="h-48 bg-gray-200 rounded-2xl mt-8" />
          </div>
          <p className="text-gray-400 mt-6 text-sm">
            Analysing video — fetching transcript and comments...
          </p>
        </div>
      ) : error ? (
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <a href="/" className="text-[#6C63FF] hover:underline">← Back to search</a>
        </div>
      ) : video && (
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

          {/* Video info */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="relative">
              <img src={video.thumbnail} alt={video.title} className="w-full h-56 object-cover" />
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="bg-white bg-opacity-90 rounded-full p-4">
                  <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </a>
            </div>
            <div className="p-5">
              <h1 className="text-xl font-bold text-gray-900 mb-1">{video.title}</h1>
              <p className="text-sm text-gray-500">
                {video.channel} · {video.views} views · {video.published}
              </p>
              <a
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-sm bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-red-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch on YouTube
              </a>
            </div>
          </div>

          {/* Scorecard */}
          {scorecard ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-gray-900 text-lg">AI Verdict</h2>
                <span
                  className={`text-sm font-bold px-3 py-1 rounded-full ${
                    scorecard.worthWatching
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {scorecard.worthWatching ? '✓ Worth watching' : '⚠ Skip or skim'}
                </span>
              </div>

              <div className="flex justify-around mb-6">
                <ScoreRing score={scorecard.relevance} label="Relevance" />
                <ScoreRing score={scorecard.depth} label="Depth" />
                <ScoreRing score={scorecard.quality} label="Quality" />
              </div>

              <p className="text-gray-700 text-sm leading-relaxed mb-4 bg-gray-50 rounded-xl p-4">
                {scorecard.verdict}
              </p>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-green-700 mb-1">⚡ Best moment</p>
                  <p className="text-xs text-gray-600">{scorecard.bestMoment}</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1">🔍 Not covered</p>
                  <p className="text-xs text-gray-600">{scorecard.missedTopics}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
              <p className="text-gray-400 text-sm">
                Transcript not available — AI scorecard could not be generated.
              </p>
            </div>
          )}

          {/* Comment insights */}
          {comments.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-4">Top Comment Insights</h2>
              <div className="space-y-4">
                {comments.map((comment, i) => (
                  <div key={i} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400">{comment.author}</span>
                      <CategoryBadge category={comment.category} />
                    </div>
                    <p className="text-sm text-gray-700 mb-2">"{comment.text}"</p>
                    <p className="text-xs text-[#6C63FF] font-medium">{comment.why}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email capture */}
          {showEmail && !emailSent && (
            <div className="bg-[#6C63FF] rounded-2xl p-6 text-white">
              <h3 className="font-bold text-lg mb-1">Get weekly AI-curated YouTube finds</h3>
              <p className="text-purple-200 text-sm mb-4">Free. No spam. Unsubscribe any time.</p>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-2.5 rounded-xl text-gray-900 text-sm outline-none"
                />
                <button
                  onClick={() => { if (email) setEmailSent(true); }}
                  className="bg-white text-[#6C63FF] font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-purple-50 transition-colors"
                >
                  Subscribe
                </button>
              </div>
            </div>
          )}

          {emailSent && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
              <p className="text-green-700 font-medium">✓ You are in! Check your inbox.</p>
            </div>
          )}

          {/* Consulting CTA */}
          <div className="bg-gray-900 rounded-2xl p-6 text-white text-center">
            <p className="text-sm text-gray-400 mb-1">ViewShift was built by</p>
            <p className="font-bold text-lg mb-1">Saran Gandhi</p>
            <p className="text-sm text-gray-400 mb-4">Strategy Consultant & AI Adoption Expert</p>
            <a
              href="https://tally.so/r/q4YjAg"
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-[#6C63FF] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#5952e0] transition-colors"
            >
              What can AI build for your business? →
            </a>
          </div>

        </div>
      )}
    </main>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <AnalysePage />
    </Suspense>
  );
}
