// app/servicii/video/sessions/page.tsx

import React, { Suspense } from 'react';
import VideoSession from '@/components/VideoSession';

export const metadata = {
  title: 'Sesiune Video',
};

export default function Page() {
  return (
    <div className="min-h-screen bg-gray-900">
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen text-white">
          <p>Se încarcă player-ul video…</p>
        </div>
      }>
        <VideoSession />
      </Suspense>
    </div>
  );
}
