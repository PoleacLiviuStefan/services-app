import Link from 'next/link'
import React from 'react'
import Button from './atoms/button'

const SignUpForm = () => {
  return (
    <form className='flex flex-col lg:w-[600px] bg-white rounded-xl h-full p-8 border-secondaryColor border-4 shadow-lg shadow-primaryColor/40 gap-3 lg:gap-6 text-sm lg:text-md'>
         <Link href="/autentificare"><p className='text-primaryColor'>Aveti deja un cont? <span className='font-semibold'>Spre Autentificare</span></p></Link>
        <div className='grid grid-cols-2 gap-4'>
            <div className='flex flex-col '>
                <label className=' font-semibold text-gray-500 text-md '>Nume</label>
                <input className=' w-full h-9 lg:h-12 p-2 lg:p-4    border-2 border-primaryColor focus:outline-none  rounded-lg bg-white' placeholder='Completeaza cu numele de familie' />
            </div>
            <div className='flex flex-col '>
                <label className='font-semibold text-gray-500 text-md'>Prenume</label>
                <input className=' w-full h-9 lg:h-12 p-2 lg:p-4  px-2  border-2 border-primaryColor focus:outline-none  rounded-lg bg-white' placeholder='Completeaza cu prenumele' />
            </div>
        </div>
        <div>
        <label className='font-semibold text-gray-500 '>Email</label>
        <input className=' w-full h-9 lg:h-12 p-2 lg:p-4  px-2  border-2 border-primaryColor focus:outline-none rounded-lg bg-white' placeholder='Completeaza cu email-ul' />
        </div>
        <div>
        <label className='font-semibold text-gray-500 '>Parola</label>
        <input className=' w-full h-9 lg:h-12 p-2 lg:p-4  px-2  border-2 border-primaryColor focus:outline-none  rounded-lg bg-white' placeholder='Parola (minim 6 caractere, inclusiv cifre si caractere speciale)' />
        </div>
        <div>
        <label className='font-semibold text-gray-500 '>Data Nasterii</label>
        <input type="date" className=' w-full h-9 lg:h-12 p-2 lg:p-4  px-2  border-2 border-primaryColor focus:outline-none  rounded-lg bg-white'  />
        </div>
        <div className='flex flex-col'>
        <label className='font-semibold text-gray-500 '>Gen</label>
        <select defaultValue="Selecteaza" className='w-full h-9 lg:h-12 p-2 lg:p-4   px-2  border-2 border-primaryColor focus:outline-none  rounded-lg bg-white'>
            <option value="masculin">Masculin</option>
            <option value="feminin">Feminin</option>
            <option value="altul">Altul</option>
        </select>
        </div>
        <div className="flex items-center space-x-2">
            
            <input type="checkbox" className="h-4 w-4  " />
            <p className='font-thin text-gray-500 '>Apasand pe acest camp, sunteti de acord cu <Link href="termeni-si-conditii" className='text-primaryColor font-semibold'>Termenii si conditiile</Link></p>
        </div>
        <Button className='border-2 border-primaryColor font-semibold py-2 transition duration-300 ease-in-out hover:bg-primaryColor hover:text-white'>CONTINUARE</Button>
    </form>
  )
}

export default SignUpForm