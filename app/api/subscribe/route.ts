import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    // Basic email validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    const apiKey = process.env.BEEHIIV_API_KEY;
    const publicationId = process.env.BEEHIIV_PUBLICATION_ID;

    if (!apiKey || !publicationId) {
      console.error('Beehiiv env vars missing — check BEEHIIV_API_KEY and BEEHIIV_PUBLICATION_ID in .env.local');
      return NextResponse.json({ error: 'Subscription service not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${publicationId}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          email,
          send_welcome_email: false,
          double_opt_override: 'off', // single opt-in for now
          reactivate_existing: true, // previously unsubscribed → re-add cleanly
          utm_source: 'viewshift_analyse_page',
          utm_medium: 'website',
        }),
      }
    );

    // 2xx = success, 201 for new subscriber, 200 for existing
    if (response.ok) {
      return NextResponse.json({ success: true });
    }

    // Handle "already subscribed" gracefully — same UX as success
    const errorBody = await response.text();
    const lowerBody = errorBody.toLowerCase();
    if (
      response.status === 400 &&
      (lowerBody.includes('already') || lowerBody.includes('exists') || lowerBody.includes('duplicate'))
    ) {
      return NextResponse.json({ success: true, alreadySubscribed: true });
    }

    console.error('Beehiiv API error:', response.status, errorBody);
    return NextResponse.json(
      { error: 'Could not subscribe right now. Please try again.' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Subscribe route error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
