'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function VerifyMailContent() {
  const params = useSearchParams()
  const token = params.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('Token lipsă sau invalid.')
      return
    }
    ;(async () => {
      try {
        const res = await fetch('/api/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()
        if (res.ok) setStatus('success')
        else {
          setStatus('error')
          setErrorMsg(data.error || 'Verificare eșuată.')
        }
      } catch {
        setStatus('error')
        setErrorMsg('Nu am putut contacta serverul.')
      }
    })()
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white shadow-md rounded-lg p-6 max-w-md w-full text-center">
        {status === 'loading' && <p className="text-gray-700">Se verifică adresa de email…</p>}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-bold text-green-600 mb-4">Email verificat!</h1>
            <p className="mb-6">Contul tău este acum activ.</p>
            <Link
              href="/autentificare"
              className="inline-block px-6 py-2 bg-primaryColor text-white rounded hover:bg-blue-700"
            >
              Conectează-te
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Verificare eșuată</h1>
            <p className="text-gray-700 mb-6">{errorMsg}</p>
            <Link
              href="/"
              className="inline-block px-6 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Încearcă din nou
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
