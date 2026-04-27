import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();

    if (!image) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: 'This is a screenshot or image related to a YouTube video. Extract the most useful search query to find this video or similar videos on YouTube. Return ONLY the search query, nothing else. Maximum 10 words.',
            },
          ],
        },
      ],
    });

    const query = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : '';

    return NextResponse.json({ query });
  } catch (error) {
    console.error('Vision error:', error);
    return NextResponse.json(
      { error: 'Image analysis failed. Please try a text search instead.' },
      { status: 500 }
    );
  }
}