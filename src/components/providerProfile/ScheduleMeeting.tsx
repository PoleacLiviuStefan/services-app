// File: components/ScheduleMeeting.tsx
'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Head from 'next/head';

interface ScheduleMeetingProps {
  locale?:   string;
  duration?: number;
}

export default function ScheduleMeeting({
  locale = 'ro',
  duration,
}: ScheduleMeetingProps) {
  const [schedulingUrl, setSchedulingUrl] = useState<string>('');
  const [scriptReady,   setScriptReady]   = useState(false);

  // 1) Fetch schedulingUrl de la endpoint-ul nostru
  useEffect(() => {
    console.log('[Calendly] fetching /api/calendly/user…');
    fetch('/api/calendly/user')
      .then(res => {
        console.log('[Calendly] /api response status:', res.status);
        return res.json();
      })
      .then(data => {
        if (data.error) {
          console.error('[Calendly] /api error:', data.error);
          return;
        }
        // data.resource.scheduling_url conține URL-ul unic al calendarului provider-ului
        console.log('[Calendly] got schedulingUrl:', data.resource.scheduling_url);
        setSchedulingUrl(data.resource.scheduling_url);
      })
      .catch(err => console.error('[Calendly] fetch error:', err));
  }, []);

  // 2) Init widget când scriptul și URL-ul sunt gata
  useEffect(() => {
    console.log(
      '[Calendly] init effect: scriptReady=',
      scriptReady,
      ' schedulingUrl=',
      schedulingUrl
    );
    if (!scriptReady || !schedulingUrl) return;

    const params = new URLSearchParams({
      locale,
      ...(duration ? { duration: duration.toString() } : {}),
    }).toString();

    const fullUrl = `${schedulingUrl}?${params}`;
    console.log('[Calendly] calling initInlineWidget with URL:', fullUrl);

    try {
      ;(window as any).Calendly.initInlineWidget({
        url:           fullUrl,
        parentElement: document.getElementById('calendly-inline')!,
      });
    } catch (e) {
      console.error('[Calendly] initInlineWidget error:', e);
    }
  }, [scriptReady, schedulingUrl, locale, duration]);

  return (
    <>
      <Head>
        <link
          rel="stylesheet"
          href="https://assets.calendly.com/assets/external/widget.css"
        />
      </Head>

      <div
        style={{
          width: '100%',
          height: '700px',
          border: '2px dashed red',
          position: 'relative',
        }}
      >
        {!schedulingUrl && <p style={{ padding: 16 }}>Loading schedulingUrl…</p>}
        {schedulingUrl && !scriptReady && (
          <p style={{ padding: 16 }}>Waiting for Calendly script…</p>
        )}
        <div
          id="calendly-inline"
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('[Calendly] widget.js loaded');
          setScriptReady(true);
        }}
        onError={(e) =>
          console.error('[Calendly] widget.js failed to load', e)
        }
      />
    </>
  );
}
