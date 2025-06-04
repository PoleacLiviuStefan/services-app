// components/NewPasswordForm.tsx
'use client'

import React, { useRef, useState, FormEvent } from 'react'
import Button from './atoms/button'
import InputForm from './ui/inputForm'
import { useRouter } from 'next/navigation'

interface NewPasswordFormProps {
  token: string
}

const NewPasswordForm: React.FC<NewPasswordFormProps> = ({ token }) => {
  const newPasswordRef = useRef<HTMLInputElement>(null)
  const confirmPasswordRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const newPassword = newPasswordRef.current?.value.trim() ?? ''
    const confirmPassword = confirmPasswordRef.current?.value.trim() ?? ''

    // 1. Verificare câmpuri completate
    if (!newPassword || !confirmPassword) {
      setError('Te rog completează ambele câmpuri.')
      return
    }

    // 2. Verificare potrivire parole
    if (newPassword !== confirmPassword) {
      setError('Parolele nu coincid.')
      return
    }

    // 3. Validări suplimentare (minim 6 caractere, literă mare, caracter special)
    if (newPassword.length < 6) {
      setError('Parola trebuie să aibă minim 6 caractere.')
      return
    }
    if (!/[A-Z]/.test(newPassword)) {
      setError('Parola trebuie să conțină cel puțin o literă mare.')
      return
    }
    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError('Parola trebuie să conțină cel puțin un caracter special.')
      return
    }

    // Dacă am ajuns aici, toate validările sunt OK → trimitem cererea
    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await res.json()
      if (res.ok) {
        setSuccess('Parola a fost schimbată cu succes.')
        // redirect către pagina de autentificare
        router.push('/autentificare')
      } else {
        // Dacă server-ul a returnat erori de validare (ex. în response.errors)
        if (data.errors) {
          // Putem alege să afișăm primul mesaj de eroare din Zod
          const fieldErrors = data.errors.newPassword
          setError(Array.isArray(fieldErrors) ? fieldErrors.join(' ') : 'Eroare la validarea parolei.')
        } else {
          setError(data.error || 'A apărut o eroare necunoscută.')
        }
      }
    } catch {
      setError('Nu am putut contacta serverul. Încearcă mai târziu.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col lg:w-[600px] bg-white rounded-xl w-full p-8 border-secondaryColor border-4 shadow-lg shadow-primaryColor/40 gap-3 lg:gap-6 text-sm lg:text-md"
    >
      <div>
        <label htmlFor="newPassword" className="font-semibold text-gray-500">
          Parolă nouă
        </label>
        <InputForm
          ref={newPasswordRef}
          id="newPassword"
          type="password"
          name="newPassword"
          placeholder="Introdu parola nouă"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="font-semibold text-gray-500">
          Confirmă parola
        </label>
        <InputForm
          ref={confirmPasswordRef}
          id="confirmPassword"
          type="password"
          name="confirmPassword"
          placeholder="Confirmă parola"
        />
      </div>

      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}

      <Button
        type="submit"
        disabled={isLoading}
        className="border-2 border-primaryColor font-semibold py-2 transition duration-300 ease-in-out hover:bg-primaryColor hover:text-white"
      >
        {isLoading ? 'Se procesează...' : 'Setează parola'}
      </Button>
    </form>
  )
}

export default NewPasswordForm
