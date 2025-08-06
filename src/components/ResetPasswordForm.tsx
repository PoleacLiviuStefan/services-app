'use client'

import React, { useRef, useState, FormEvent } from "react"
import { useTranslation } from '@/hooks/useTranslation';
import Button from "./atoms/button"
import InputForm from "./ui/inputForm"

const ResetPasswordForm: React.FC = () => {

  const { t } = useTranslation();
  // 👇 ref pentru <input>
  const emailRef = useRef<HTMLInputElement>(null)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // 👇 ia valoarea din ref
    const email = emailRef.current?.value.trim() ?? ""

    if (!email) {
      setError(t('resetPassword.errorEmailRequired'))
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setSuccess(t('resetPassword.success'))
      } else {
        const data = await res.json()
        setError(data.error || t('resetPassword.errorGeneric'))
      }
    } catch {
      setError(t('resetPassword.errorNetwork'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col lg:w-[600px] bg-white rounded-xl w-full h-full p-8 border-secondaryColor border-4 shadow-lg shadow-primaryColor/40 gap-3 lg:gap-6 text-sm lg:text-md"
    >
      <div>
        <label className="font-semibold text-gray-500" htmlFor="email">
          {t('resetPassword.email')}
        </label>
        <InputForm
          ref={emailRef}
          id="email"
          type="email"
          name="email"
          placeholder={t('resetPassword.emailPlaceholder')}
        />
      </div>

      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}

      <Button
        type="submit"
        disabled={isLoading}
        className="border-2 border-primaryColor font-semibold py-2 transition duration-300 ease-in-out hover:bg-primaryColor hover:text-white"
      >
        {isLoading ? t('resetPassword.processing') : t('resetPassword.sendButton')}
      </Button>
    </form>
  )
}

export default ResetPasswordForm
