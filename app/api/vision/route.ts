import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { image, mediaType } = await req.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const validMediaType = allowedTypes.includes(mediaType) ? mediaType : 'image/jpeg';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: validMediaType,
                  data: image,
                },
              },
              {
                type: 'text',
                text: `Look at this image and generate a concise YouTube search query (3-7 words) that would help the user find videos answering their likely question or solving the problem shown.

Examples:
- Screenshot of a broken pipe → "fix leaking pipe under sink"
- Photo of a plant with yellow leaves → "yellow leaves houseplant fix"
- Screenshot of an error message → use the exact error text
- Recipe ingredients laid out → "[main dish] recipe"
- Product packaging → "[product name] review"
- A how-to question on a forum → rephrase as a search query

Return ONLY the search query as plain text. No quotes, no preamble, no explanation.`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      return NextResponse.json(
        { error: 'AI service error' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const textBlock = data.content?.find((block: { type: string }) => block.type === 'text');
    const query = textBlock?.text?.trim();

    if (!query) {
      return NextResponse.json(
        { error: 'Could not generate query from image' },
        { status: 500 }
      );
    }

    return NextResponse.json({ query });
  } catch (error) {
    console.error('Vision route error:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}
