'use client'
import Link from 'next/link';
import React from 'react';
import Button from './atoms/button';
import { FaUserAlt, FaChevronDown } from "react-icons/fa";
// import Tooltip from './ui/tooltip';
import { useSession, signOut } from 'next-auth/react';

const Navbar = () => {
  const { data: session,status } = useSession();
  const user = session?.user;
  const specialities = ["Specializare1", "Specializare2", "Specializare3", "Specializare4", "Specializare5"];
  console.log("Session status:", status);
  return (
    <div className="hidden lg:flex fixed top-0 left-0 justify-between items-center text-textPrimaryColor px-20 z-50 h-[60px] w-full bg-primaryColor/95">
      <h3 className="text-xl font-bold">LOGO</h3>
      <ul className="flex space-x-12 font-semibold">
        {["ACASA", "ASTROLOGI", "DESPRE NOI", "ARTICOLE"].map((item, index) => (
          <li key={index} className="relative group cursor-pointer flex  items-center justify-center">
            <Link href={item === "ACASA" ? "/" : `/${item.toLowerCase()}`}>
              <span className="inline-block transition-colors duration-500 ease-in-out hover:underline hover:text-gray-200">
                {item}
              </span>
            </Link>
            {item === "ASTROLOGI" && (
              <>
                <span className="ml-2 opacity-0 transform -translate-x-2 transition-all duration-500 ease-in-out group-hover:opacity-100 group-hover:translate-x-0">
                  <FaChevronDown />
                </span>
                <ul className="absolute z-50 top-10 left-0 bg-white text-primaryColor opacity-0 invisible transition-all duration-300 group-hover:opacity-100 group-hover:visible border-b-primaryColor border rounded-b-lg shadow-lg">
                  {specialities.map((speciality, index) => (
                    <li key={index} className='hover:bg-primaryColor/10 w-full h-full p-3 font-light text-sm'>{speciality}</li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="flex space-x-4 relative">
        {user?.name ? (
          <div className="relative group">
            {/* Butonul userului */}
            <Button className="px-4 py-2 gap-4 shadow-md shadow-primaryColor bg-gradient-to-tr from-10 from-buttonPrimaryColor to-buttonSecondaryColor to-80 text-md hover:text-white hover:bg-primaryColor font-semibold border-2 border-buttonSecondaryColor/30">
              <FaUserAlt />
              <span className="max-w-20 truncate">{user?.name}</span>
            </Button>

            {/* Meniul dropdown */}
            <div className="absolute right-0 mt-2 w-36 bg-white text-primaryColor rounded-md shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
              <Link href="/profil">
                <p className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Profil</p>
              </Link>
              <button
                onClick={() => signOut()}
                className="w-full text-red bg-red-600 text-white font-bold text-left px-4 py-2 hover:bg-red-700 cursor-pointer"
              >
                Deconectare
              </button>
            </div>
          </div>
        ) : (
          <Link href="/autentificare">
            <Button className="px-4 py-2 gap-4 shadow-md shadow-primaryColor bg-gradient-to-tr from-10 from-buttonPrimaryColor to-buttonSecondaryColor to-80 text-md hover:text-white hover:bg-primaryColor font-semibold border-2 border-buttonSecondaryColor/30">
              <FaUserAlt />Autentificare
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Navbar;
