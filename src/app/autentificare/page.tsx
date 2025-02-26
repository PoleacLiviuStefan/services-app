
import SignInForm from '@/components/SignInForm'
import React from 'react'

const page = () => {
  return (
    <div className='flex justify-center items-center min-h-screen min-w-screen h-full w-full bg-gradient-to-t from-primaryColor to-secondaryColor'>
        <SignInForm />
    </div>
  )
}

export default page