// app/verificare-mail/page.tsx
'use client'
export const dynamic = 'force-dynamic'

import VerifyMailContent from '@/components/VerifyMailContent'
import { Suspense } from 'react'
export default function Page() {
  return (
    <Suspense fallback={<p className="text-center p-4">Se încarcă…</p>}>
      <VerifyMailContent />
    </Suspense>
  )
}
