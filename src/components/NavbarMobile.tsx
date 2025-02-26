'use client'
import React, { useState } from 'react';
import Link from 'next/link';
import { FaUser } from 'react-icons/fa';
import Button from './atoms/button';

const NavbarMobile = () => {
  const [isOpen, setIsOpen] = useState(false);
  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="lg:hidden fixed top-0 left-0 w-full h-[50px] z-50 bg-primaryColor">
      {/* Header: Hamburger (stânga), Logo (centru), User Icon (dreapta) */}
      <div className="flex items-center justify-between px-4 h-full z-50">
        <button 
          onClick={toggleMenu} 
          className="relative w-8 h-8 focus:outline-none z-50"
        >
          {/* Hamburger icon */}
          <span
            className={`block absolute h-0.5 w-6 bg-white transform transition duration-300 ease-in-out 
                        ${isOpen ? 'rotate-45 top-3.5' : 'top-1'}`}
          ></span>
          <span
            className={`block absolute h-0.5 w-6 bg-white transform transition duration-300 ease-in-out 
                        ${isOpen ? 'opacity-0' : 'top-3.5'}`}
          ></span>
          <span
            className={`block absolute h-0.5 w-6 bg-white transform transition duration-300 ease-in-out 
                        ${isOpen ? '-rotate-45 top-3.5' : 'top-6'}`}
          ></span>
        </button>

        <div className="flex-grow text-center z-50">
          <span className="text-white font-bold">LOGO</span>
        </div>
        <Link href="/autentificare">
        <Button className="relative w-6 h-6 focus:outline-none z-50">
          <FaUser className="text-white w-full h-full " /> 
        </Button>
        </Link>
      </div>

      {/* Meniul mobil: apare de sub bara de navigare */}
      <div 
        className={`fixed top-[50px] left-0 w-full bg-primaryColor transform transition-transform duration-300 ease-in-out  
                    ${isOpen ? 'translate-y-0' : '-translate-y-full'}`}
      >
        <ul className="flex flex-col items-center justify-center h-screen space-y-8 text-white text-xl pt-8 z-50">
          <li onClick={()=>setIsOpen(false)}><Link href="/">ACASA</Link></li>
          <li onClick={()=>setIsOpen(false)}><Link href="/psihologi">PSIHOLOGI</Link></li>
          <li onClick={()=>setIsOpen(false)}><Link href="/">DESPRE NOI</Link></li>
          <li onClick={()=>setIsOpen(false)}><Link href="/">ARTICOLE</Link></li>
        </ul>
      </div>
    </nav>
  );
};

export default NavbarMobile;
