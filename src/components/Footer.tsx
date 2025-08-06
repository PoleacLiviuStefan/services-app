"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import mysticLogo from "../../public/mysticnoblack.svg";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

const Footer = () => {
    const router = useRouter();
    const { t, language } = useTranslation();
    
    console.log("🦶 Footer render with language:", language);

  const handleDespreNoiClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Verifică dacă suntem pe homepage
    if (window.location.pathname === "/") {
      // Scrollează direct către secțiune
      const element = document.getElementById("despre-noi");
      if (element) {
        element.scrollIntoView({ 
          behavior: "smooth", 
          block: "start" 
        });
      }
    } else {
      // Mergi la homepage și apoi scrollează
      router.push("/");
      setTimeout(() => {
        const element = document.getElementById("despre-noi");
        if (element) {
          element.scrollIntoView({ 
            behavior: "smooth", 
            block: "start" 
          });
        }
      }, 100); // Mic delay pentru a permite încărcarea paginii
    }
  };
   const navItems = [
    { name: t('footer.home'), href: "/" },
    { name: t('footer.astrologers'), href: "/astrologi" },
    { name: t('footer.aboutUs'), href: "#despre-noi", onClick: handleDespreNoiClick }
  ];
  return (
    <div className="w-full h-full py-4  lg:h-[200px] bg-gradient-to-t from-secondaryColor to-primaryColor/80 via-primaryColor px-20">
      <div className="flex flex-col space-y-4 text-white lg:flex-row h-full flex justify-between items-center">
        {/* Coloana 1: Logo */}
        <div className="flex flex-col items-center">
          <Link href="/">
            <Image
              src={mysticLogo}
              alt="Logo"
              className="w-[60px] h-auto"
              priority
            />
          </Link>
          <p>CUI: 51765903 | J2025033218000</p>
        </div>

        {/* Coloana 2: Elemente din Navbar */}
        <div className="flex flex-col items-center lg:items-start space-3 lg:space-y-5">
          <h4 className="text-xl font-semibold">{t('footer.navigation')}</h4>
          <ul className="flex flex-col items-center lg:items-start space-y-3  text-white">
                 {navItems.map((item, index) => (
        <li key={index} className="cursor-pointer">
          {item.onClick ? (
            <a href={item.href} onClick={item.onClick}>
              <span className="hover:underline">{item.name}</span>
            </a>
          ) : (
            <Link href={item.href}>
              <span className="hover:underline">{item.name}</span>
            </Link>
          )}
        </li>
      ))}
          </ul>
        </div>

                {/* Coloana 3: Elemente din Navbar */}
        <div className="flex flex-col items-center lg:items-start space-y-3 lg:space-y-5">
          <h4 className="text-xl font-semibold">{t('footer.legal')}</h4>
          <ul className="flex flex-col items-center lg:items-start space-y-3  text-white">
          
              <li className="cursor-pointer">
                <Link href="/juridic/termeni-si-conditii">
                  <span className="hover:underline">{t('footer.termsOfUse')}</span>
                </Link>
              </li>
                        
              <li className="cursor-pointer">
                <Link href="/juridic/politica-de-utilizare">
                  <span className="hover:underline">{t('footer.usagePolicy')}</span>
                </Link>
              </li>
                        
              <li className="cursor-pointer">
                <Link href="/juridic/politica-de-plata">
                  <span className="hover:underline">{t('footer.paymentPolicy')}</span>
                </Link>
              </li>
          
          </ul>
        </div>

        {/* Coloana 4: Două imagini (înlocuieşte path-urile cu ale tale) */}
        <div className="flex flex-col space-y-4">
          <Image
            src="/SAL.svg"
            alt="Imagine 1"
            width={200}
            height={200}
            className="object-cover rounded"
          />
          <Image
            src="/SOL.svg"
            alt="Imagine 2"
            width={200}
            height={200}
            className="object-cover rounded"
          />
        </div>
      </div>
    </div>
  );
};

export default Footer;
