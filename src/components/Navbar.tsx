import Link from 'next/link'
import React from 'react'
import Button from './atoms/button'
import { FaUserAlt,FaChevronDown  } from "react-icons/fa";

const Navbar = () => {
  return (
    <div className='hidden lg:flex fixed top-0 left-0 justify-between items-center text-textPrimaryColor px-20 fixed z-50 h-[60px] w-full bg-primaryColor/95'>
        <h3 className='text-xl font-bold'>LOGO</h3>
        <ul className="flex space-x-12 font-semibold">
  {["ACASA", "PSIHOLOGI", "DESPRE NOI", "ARTICOLE"].map((item, index) => (
    <li key={index} className="relative group cursor-pointer flex items-center">
      <Link href={item==="ACASA" ? "/" : `/${item.toLowerCase()}`}>
        <span className="inline-block transition-colors duration-500 ease-in-out hover:underline hover:text-gray-200">
          {item}
        </span>
      </Link>
      {item === "PSIHOLOGI" && (
        <span className="ml-2 opacity-0 transform -translate-x-2 transition-all duration-500 ease-in-out group-hover:opacity-100 group-hover:translate-x-0">
          <FaChevronDown />
        </span>
      )}
    </li>
  ))}
</ul>





        <div className='flex space-x-4'>
            <Link href="/autentificare"><Button  className='px-4 py-2  gap-4 shadow-xl shadow-primaryColor bg-gradient-to-tr from-10 from-buttonPrimaryColor to-buttonSecondaryColor to-80 text-md hover:text-white hover:bg-primaryColor font-semibold border-2 border-buttonSecondaryColor/30' ><span><FaUserAlt /></span>Autentificare</Button></Link>
        </div>
    </div>
  )
}

export default Navbar