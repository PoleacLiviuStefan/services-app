import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const token = req.headers.get('Authorization')?.split(' ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  const params = new URLSearchParams({
    user:      'https://api.calendly.com/users/84d39d32-e4f4-41b2-a20c-b347ea70ed8c',
    status:    'active',
    count:     '50'
  });

  const res = await fetch(`https://api.calendly.com/scheduled_events?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Calendly API error' }, { status: res.status });
  }

  const { collection } = await res.json();
  return NextResponse.json(collection);
}
