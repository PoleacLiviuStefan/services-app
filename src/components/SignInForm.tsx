import Link from 'next/link'
import React from 'react'
import Button from './atoms/button'

const SignInForm = () => {
  return (
    <form className='flex flex-col lg:w-[600px] bg-white rounded-xl w-full h-full p-8 border-secondaryColor border-4 shadow-lg shadow-primaryColor/40 gap-3 lg:gap-6 text-sm lg:text-md'>
        <Link href="/inregistrare"><p className='text-primaryColor'>Nu aveti un cont? <span className='font-semibold'>Spre Inregistrare</span> </p></Link>
        
        <div>
        <label className='font-semibold text-gray-500 '>Email</label>
        <input className=' w-full h-9 lg:h-12 p-2 lg:p-4  px-2  border-2 border-primaryColor focus:outline-none rounded-lg bg-white' placeholder='Completeaza cu email-ul' />
        </div>
        <div>
        <label className='font-semibold text-gray-500 '>Parola</label>
        <input className=' w-full h-9 lg:h-12 p-2 lg:p-4  px-2  border-2 border-primaryColor focus:outline-none  rounded-lg bg-white' placeholder='Parola (minim 6 caractere, inclusiv cifre si caractere speciale)' />
        </div>
        <Link href="/autentificare"><p className='text-primaryColor'>Ai uitat parola? Resetare Parola </p></Link>
        <Button className='border-2 border-primaryColor font-semibold py-2 transition duration-300 ease-in-out hover:bg-primaryColor hover:text-white'>AUTENTIFICARE</Button>
    </form>
  )
}

export default SignInForm