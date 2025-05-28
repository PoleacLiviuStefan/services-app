'use client'

import React, { useRef, useState, FormEvent } from "react"
import Button from "./atoms/button"
import InputForm from "./ui/inputForm"

const ResetPasswordForm: React.FC = () => {
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
      setError("Te rog introdu un email valid.")
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
        setSuccess("Email-ul de resetare a fost trimis. Verifică-ți inbox-ul.")
      } else {
        const data = await res.json()
        setError(data.error || "A apărut o eroare. Încearcă din nou.")
      }
    } catch {
      setError("Nu am putut contacta serverul. Încearcă mai târziu.")
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
          Email
        </label>
        {/* 👇 păstrăm InputForm așa cum e */}
        <InputForm
          ref={emailRef}
          id="email"
          type="email"
          name="email"
          placeholder="Completați cu email-ul"
        />
      </div>

      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}

      <Button
        type="submit"
        disabled={isLoading}
        className="border-2 border-primaryColor font-semibold py-2 transition duration-300 ease-in-out hover:bg-primaryColor hover:text-white"
      >
        {isLoading ? "Se procesează..." : "Trimite link de resetare"}
      </Button>
    </form>
  )
}

export default ResetPasswordForm
