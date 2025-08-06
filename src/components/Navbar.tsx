"use client";
import Link from "next/link";
import React, { useEffect, useMemo } from "react";
import Button from "./atoms/button";
import { FaUserAlt, FaChevronDown } from "react-icons/fa";
import { useSession } from "next-auth/react";
import mysticLogo from "../../public/mysticnoblack.svg";
import Image from "next/image";
import { displayedServices } from "@/utils/constants";
import handleLogout from "@/lib/api/logout/logout";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import LanguageSwitcher from "./LanguageSwitcher";

const Navbar = () => {
  const { data: session } = useSession();
  const { t, language } = useTranslation();
  const user = session?.user;
  // Use service keys for translation
  const serviceKeys = displayedServices;
  
  console.log("🚀 Navbar render with language:", language);
  
  const rawName = session?.user?.name ?? "";
  const slug = encodeURIComponent(rawName.trim().split(/\s+/).join("-"));
  const router = useRouter();

  // Definim elementele de navigare cu cheile de traducere - folosim useMemo pentru re-render
  const navigationItems = useMemo(() => [
    { key: "navigation.home", originalText: "ACASA" },
    { key: "navigation.psychologists", originalText: "SERVICII EZOTERICE" },
    { key: "navigation.about", originalText: "DESPRE NOI" },
    { key: "navigation.articles", originalText: "ARTICOLE" }
  ], []); // Gol pentru a evita warning-ul, dar language va triggera re-render oricum

  // 🔧 Effect pentru scroll după navigare
  useEffect(() => {
    // Verifică dacă URL-ul conține hash-ul #despre-noi
    if (window.location.hash === "#despre-noi") {
      setTimeout(() => {
        const element = document.getElementById("despre-noi");
        if (element) {
          element.scrollIntoView({ 
            behavior: "smooth", 
            block: "start" 
          });
        }
      }, 100);
    }
  }, [router]);

  // 🔧 Funcție pentru generarea URL-urilor
  const getNavHref = (originalText: string): string => {
    switch (originalText) {
      case "ACASA":
        return "/";
      case "SERVICII EZOTERICE":
        return "/astrologi";
      case "DESPRE NOI":
        return "/#despre-noi"; // 🔧 Scroll către secțiunea About
      default:
        return `/${originalText.toLowerCase().replace(/\s+/g, '-')}`;
    }
  };

  // 🔧 Handler pentru scroll către secțiunea About
  const handleDespreNoiClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (window.location.pathname === "/") {
      // Dacă suntem pe homepage, scrollează direct
      const element = document.getElementById("despre-noi");
      if (element) {
        element.scrollIntoView({ 
          behavior: "smooth", 
          block: "start" 
        });
      }
    } else {
      // Dacă suntem pe altă pagină, navighează cu hash
      router.push("/#despre-noi");
    }
  };

  return (
    <div className="hidden lg:flex fixed top-0 left-0 justify-between items-center text-textPrimaryColor px-20 z-50 h-[60px] w-full bg-primaryColor/95">
      {/* Logo */}
      <Link href="/">
        <Image src={mysticLogo} alt="Logo" className="w-[60px] h-full" />
      </Link>

      {/* Navigation Menu */}
      <ul className="flex space-x-12 font-semibold">
        {navigationItems.map((navItem, index) => (
          <li
            key={index}
            className="relative group cursor-pointer flex items-center justify-center"
          >
            {/* 🔧 Link special pentru DESPRE NOI cu scroll handler */}
            {navItem.originalText === "DESPRE NOI" ? (
              <a 
                href={getNavHref(navItem.originalText)}
                onClick={handleDespreNoiClick}
                className="inline-block transition-colors duration-500 ease-in-out hover:underline hover:text-gray-200"
              >
                {t(navItem.key)}
              </a>
            ) : (
              <Link href={getNavHref(navItem.originalText)}>
                <span className="inline-block transition-colors duration-500 ease-in-out hover:underline hover:text-gray-200">
                  {t(navItem.key)}
                </span>
              </Link>
            )}

            {/* Dropdown pentru SERVICII EZOTERICE */}
            {navItem.originalText === "SERVICII EZOTERICE" && (
              <>
                <span className="ml-2 opacity-0 transform -translate-x-2 transition-all duration-500 ease-in-out group-hover:opacity-100 group-hover:translate-x-0">
                  <FaChevronDown />
                </span>
                <ul className="absolute z-50 top-10 left-0 bg-white text-primaryColor opacity-0 invisible transition-all duration-300 group-hover:opacity-100 group-hover:visible border-b-primaryColor border rounded-b-lg shadow-lg min-w-max">
                  {serviceKeys.map((serviceKey) => (
                    <li
                      key={serviceKey}
                      className="hover:bg-primaryColor/10 w-full"
                    >
                      <Link
                        href={`/astrologi?speciality=${encodeURIComponent(serviceKey)}`}
                        className="block p-3 font-light text-sm w-full h-full transition-colors duration-200"
                      >
                        {t('services.' + serviceKey)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </li>
        ))}
      </ul>

      {/* User Menu */}
      <div className="flex items-center space-x-4 relative">
        {/* Language Switcher */}
        <LanguageSwitcher />
        
        {user?.name ? (
          <div className="relative group">
            {/* User Button */}
            <Button className="px-4 py-2 gap-4 shadow-md shadow-primaryColor bg-gradient-to-tr from-10 from-buttonPrimaryColor to-buttonSecondaryColor to-80 text-md hover:text-white hover:bg-primaryColor font-semibold border-2 border-buttonSecondaryColor/30">
              <FaUserAlt />
              <span className="max-w-20 truncate">{user.name}</span>
            </Button>

            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-36 bg-white text-primaryColor rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 border border-gray-200">
              <Link 
                href="/profil"
                className="block px-4 py-2 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
              >
                {t('navigation.profile')}
              </Link>
              <button
                onClick={() => handleLogout(slug)}
                className="w-full text-left px-4 py-2 bg-red-600 text-white font-bold hover:bg-red-700 cursor-pointer transition-colors duration-200 rounded-b-md"
              >
                {t('navigation.logout')}
              </button>
            </div>
          </div>
        ) : (
          <Link href="/autentificare">
            <Button className="px-4 py-2 gap-4 shadow-md shadow-primaryColor bg-gradient-to-tr from-10 from-buttonPrimaryColor to-buttonSecondaryColor to-80 text-md hover:text-white hover:bg-primaryColor font-semibold border-2 border-buttonSecondaryColor/30">
              <FaUserAlt />
              {t('navigation.login')}
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Navbar;