// app/api/calendly/users/me.ts (Next.js API Route)
import { NextResponse } from 'next/server';

export async function GET() {
  const token = process.env.CALENDLY_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  const res = await fetch('https://api.calendly.com/users/me', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type':  'application/json'
    }
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Calendly API error' }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
