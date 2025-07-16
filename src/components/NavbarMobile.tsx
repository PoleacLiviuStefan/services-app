'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { FaUserAlt, FaChevronDown } from 'react-icons/fa';
import Button from './atoms/button';
import { useSession  } from 'next-auth/react';
import mysticLogo from '../../public/mysticnoblack.svg';
import Image from 'next/image';
// import { useCatalogStore } from '@/store/catalog';
import { displayedServices } from '@/lib/constants';
import handleLogout from '@/lib/api/logout/logout';

const NavbarMobile = () => {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isPsychologistsOpen, setIsPsychologistsOpen] = useState(false);
  const user = session?.user;

  const toggleMenu = () => setIsOpen(!isOpen);
  const togglePsychologists = () => setIsPsychologistsOpen(!isPsychologistsOpen);

  // const specialities = useCatalogStore((state) => state.specialities);
  const specialities = displayedServices
  const rawName = session?.user?.name ?? "";
  const slug = encodeURIComponent(
    rawName.trim().split(/\s+/).join("-")
  )
  return (
    <nav className="lg:hidden fixed top-0 left-0 w-full h-[50px] z-50 bg-primaryColor">
      <div className="flex items-center justify-between px-4 h-full z-50">
        {/* Hamburger button in a fixed-width container */}
        <div className="w-10 flex items-center">
          <button onClick={toggleMenu} className="relative w-8 h-8 focus:outline-none z-50">
            <span className={`block absolute h-0.5 w-6 bg-white transform transition duration-300 ease-in-out ${isOpen ? 'rotate-45 top-3.5' : 'top-1'}`}></span>
            <span className={`block absolute h-0.5 w-6 bg-white transform transition duration-300 ease-in-out ${isOpen ? 'opacity-0' : 'top-3.5'}`}></span>
            <span className={`block absolute h-0.5 w-6 bg-white transform transition duration-300 ease-in-out ${isOpen ? '-rotate-45 top-3.5' : 'top-6'}`}></span>
          </button>
        </div>

        {/* Logo in absolute position for perfect centering */}
        <div className="absolute z-10 left-1/2 transform -translate-x-1/2">
          <Link href="/" onClick={toggleMenu}>
            <Image src={mysticLogo} alt="Mystic Gold Logo" className="w-[60px] h-full" />
          </Link>
        </div>

        {/* User profile button in a fixed-width container */}
        <div className="w-10 flex items-center justify-end">
          {status === "loading" ? (
            <p className="text-white">...</p>
          ) : user?.name ? (
            <div className="relative group z-50">
              <Button className="px-2 py-1 z-50 gap-4 shadow-md shadow-primaryColor bg-gradient-to-tr from-buttonPrimaryColor to-buttonSecondaryColor text-md hover:text-white hover:bg-primaryColor font-semibold border-2 border-buttonSecondaryColor/30 text-white">
                <FaUserAlt />
              </Button>

              <div className="absolute right-0 mt-2 w-36 bg-white text-primaryColor rounded-md shadow-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300">
                <Link href="/profil">
                  <p className="px-4 py-2 hover:bg-gray-100 cursor-pointer">Profil</p>
                </Link>
                <button
                  onClick={() => handleLogout(slug)}
                  className="w-full bg-red-600 text-white font-bold text-left px-4 py-2 hover:bg-red-700 cursor-pointer"
                >
                  Deconectare
                </button>
              </div>
            </div>
          ) : (
            <Link href="/autentificare">
              <Button className="px-2 py-1 gap-4 z-50 shadow-md shadow-primaryColor bg-gradient-to-tr from-buttonPrimaryColor to-buttonSecondaryColor text-md hover:text-white hover:bg-primaryColor font-semibold border-2 border-buttonSecondaryColor/30 text-white">
                <FaUserAlt />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className={`fixed top-[50px] left-0 w-full bg-primaryColor transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <ul className="flex flex-col items-center justify-center h-screen space-y-8 text-white text-xl z-50">
          <li onClick={() => {setIsOpen(false); toggleMenu()}}>
            <Link href="/">ACASA</Link>
          </li>

          {/* Buton PSIHOLOGI + Lista cu animatie */}
          <li className="relative w-full text-center px-2">
            <button
              onClick={togglePsychologists}
              className="flex items-center justify-center w-full text-white font-bold px-4 py-2 focus:outline-none"
            >
              <span>SERVICII EZOTERICE</span>
              <FaChevronDown className={`ml-2 transition-transform duration-300 ${isPsychologistsOpen ? 'rotate-180' : ''}`} />
            </button>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                isPsychologistsOpen ? 'max-h-[365px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <ul className="mt-2 bg-white text-primaryColor text-center rounded-lg shadow-lg ">
                 <Link href={`/astrologi`} onClick={() => {setIsOpen(false); setIsPsychologistsOpen(false)}}> 
                <li className="py-2 px-4 hover:bg-primaryColor/10 cursor-pointer">
                  General
                </li>
                </Link>
                {specialities.map((speciality, index) => (
                  <Link key={index} href={`/astrologi?speciality=${speciality}`} onClick={() => {setIsOpen(false); setIsPsychologistsOpen(false)}} className="block w-full">
                    <li className="py-2 px-4 hover:bg-primaryColor/10 cursor-pointer">
                      {speciality}
                    </li>
                  </Link>
                ))}
              </ul>
            </div>
          </li>

          <li onClick={() => setIsOpen(false)}>
            <Link href="/">DESPRE NOI</Link>
          </li>
          {/* <li onClick={() => setIsOpen(false)}>
            <Link href="/">ARTICOLE</Link>
          </li> */}
        </ul>
      </div>
    </nav>
  );
};

export default NavbarMobile;
