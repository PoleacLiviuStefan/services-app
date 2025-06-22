// app/resetare-parola/page.tsx
import React from 'react'
import ResetPasswordForm from '@/components/ResetPasswordForm'
import NewPasswordForm from '@/components/NewPasswordForm'

interface PageProps {
  searchParams: { token?: string }
}

export default async function Page({ searchParams }: PageProps) {
   const { token } = await searchParams

  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-gradient-to-t from-primaryColor to-secondaryColor">
      {token
        ? <NewPasswordForm token={token} />
        : <ResetPasswordForm />
      }
    </div>
  )
}
