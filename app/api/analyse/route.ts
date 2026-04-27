import { NextRequest, NextResponse } from 'next/server';
import { getVideoDetails, getVideoComments } from '@/lib/youtube';
import { analyseVideoTranscript, analyseComments } from '@/lib/claude';
import { YoutubeTranscript } from 'youtube-transcript';

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

    // Get transcript
    let transcriptText = '';
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
      transcriptText = transcript.map((t) => t.text).join(' ');
    } catch {
      transcriptText = '';
    }

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