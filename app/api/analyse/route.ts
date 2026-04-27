import { NextRequest, NextResponse } from 'next/server';
import { getVideoDetails, getVideoComments } from '@/lib/youtube';
import { analyseVideoTranscript, analyseComments } from '@/lib/claude';

const SUPADATA_API_KEY = process.env.SUPADATA_API_KEY;

async function fetchTranscriptFromSupadata(videoId: string): Promise<string> {
  if (!SUPADATA_API_KEY) {
    console.error('SUPADATA_API_KEY not configured');
    return '';
  }

  try {
    const url = `https://api.supadata.ai/v1/transcript?url=https://www.youtube.com/watch?v=${videoId}&text=true&mode=auto`;
    const res = await fetch(url, {
      headers: { 'x-api-key': SUPADATA_API_KEY },
    });

    if (!res.ok) {
      console.error(`Supadata returned ${res.status} for video ${videoId}`);
      return '';
    }

    const data = await res.json();
    // Supadata returns { content: "...", lang: "en", availableLangs: [...] } when text=true
    return typeof data.content === 'string' ? data.content : '';
  } catch (err) {
    console.error('Supadata fetch error:', err);
    return '';
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('v');
  const topic = searchParams.get('topic') || '';

  if (!videoId) {
    return NextResponse.json(
      { error: 'Video ID is required' },
      { status: 400 }
    );
  }

  try {
    // Get video details and comments in parallel
    const [video, comments] = await Promise.all([
      getVideoDetails(videoId),
      getVideoComments(videoId),
    ]);

    if (!video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Get transcript via Supadata (works server-side, no IP blocking)
    const transcriptText = await fetchTranscriptFromSupadata(videoId);

    // Run AI analysis
    const hasTranscript = transcriptText.length > 100;
    const [scorecard, commentInsights] = await Promise.all([
      hasTranscript
        ? analyseVideoTranscript(video.title, transcriptText, topic || video.title)
        : Promise.resolve(null),
      comments.length > 0
        ? analyseComments(comments)
        : Promise.resolve({ topComments: [] }),
    ]);

    return NextResponse.json({
      video,
      scorecard,
      commentInsights,
      hasTranscript,
      transcriptAvailable: hasTranscript,
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}