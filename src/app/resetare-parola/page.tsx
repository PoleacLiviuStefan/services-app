// app/verificare-mail/page.tsx
'use client'
export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import VerifyMailContent from '../verificare-mail/page'


export default function Page() {
  return (
    <Suspense fallback={<p className="text-center p-4">Se încarcă…</p>}>
      <VerifyMailContent />
    </Suspense>
  )
}
