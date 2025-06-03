"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import mysticLogo from "../../public/mysticnoblack.svg";

const Footer = () => {
  return (
    <div className="w-full h-full py-4  lg:h-[200px] bg-gradient-to-t from-secondaryColor to-primaryColor/80 via-primaryColor px-20">
      <div className="flex flex-col lg:flex-row h-full flex justify-between items-center">
        {/* Coloana 1: Logo */}
        <div className="flex items-center">
          <Link href="/">
            <Image
              src={mysticLogo}
              alt="Logo"
              className="w-[60px] h-auto"
              priority
            />
          </Link>
        </div>

        {/* Coloana 2: Elemente din Navbar */}
        <div>
          <ul className="flex flex-col items-center lg:items-start space-y-4 font-semibold text-white">
            {["ACASA", "ASTROLOGI", "DESPRE NOI"].map((item, index) => (
              <li key={index} className="cursor-pointer">
                <Link href={item === "ACASA" ? "/" : `/${item.toLowerCase()}`}>
                  <span className="hover:underline">{item}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Coloana 3: Două imagini (înlocuieşte path-urile cu ale tale) */}
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
