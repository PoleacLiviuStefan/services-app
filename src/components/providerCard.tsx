"use client";

import React, { useState } from "react";
import { FaStar, FaPhoneVolume, FaVideo, FaUserTimes } from "react-icons/fa";
import { MdMessage } from "react-icons/md";
import Image from "next/image";
import Icon from "./atoms/icon";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Button from "./atoms/button";
import SettingsModal from "./ui/settingsModal";
import { ProviderInterface } from "@/interfaces/ProviderInterface";
import { formatForUrl, isError } from "@/utils/util";
import defaultAvatar from "../../public/default-avatar.webp";

interface ProviderCardProp extends ProviderInterface {
  forAdmin?: boolean;
  grossVolume?: number | null; // 🆕 Adăugat pentru afișarea sumei încasate
  highlightedCategory?: {
    type: "speciality" | "tool" | "reading" | undefined;
    name: string;
  };
  openDeleteUserModal?: void | (() => void);
}

const ProviderCard: React.FC<ProviderCardProp> = ({
  name,
  image,
  rating,
  description,
  reviews,
  speciality,
  forAdmin = false,
  grossVolume, // 🆕 Destructurat din props
  role,
  email,
  isProvider = false,
  online,
  highlightedCategory,
  openDeleteUserModal = {},
}) => {
  
  console.log("numele este: ", name);
  console.log("grossVolume este: ", grossVolume);
  const { data: session } = useSession();
  const user = session?.user;
  const [showSettingModal, setShowSettingModal] = useState(false);
  console.log("online", online);

  // 🔧 FIX: Handler pentru butonul de delete care previne propagarea
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Previne comportamentul default
    e.stopPropagation(); // Oprește propagarea evenimentului către Link
    
    // Verifică dacă openDeleteUserModal este o funcție
    if (typeof openDeleteUserModal === 'function') {
      openDeleteUserModal();
    }
  };

  const handleClientRoleChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    try {
      const res = await fetch("/api/admin/set-provider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          role: e.target.value,
        }),
      });
      if (!res.ok) throw new Error("Ceva nu a mers bine!");
    } catch (error: unknown) {
      const message = isError(error) ? error.message : String(error);

      console.error("Eroare la obținerea providerilor:", message);
    }
  };

  const handleUserRoleChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    try {
      const res = await fetch("/api/admin/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          role: e.target.value,
        }),
      });
      if (!res.ok) throw new Error("Ceva nu a mers bine!");
    } catch (error: unknown) {
      const message = isError(error) ? error.message : String(error);
      console.error("Eroare la obținerea providerilor:", message);
    }
  };

  // 🆕 Funcție pentru formatarea sumei
  const formatGrossVolume = (amount: number | null) => {
    if (amount === null || amount === undefined) return "0.00";
    return amount.toFixed(2);
  };

  return (
    <div
      className={`relative ${
        forAdmin ? "h-[750px]" : "h-card"
      } w-card border-8 border-primaryColor/10 rounded-lg hover:shadow-lg shadow-primaryColor transition duration-300 ease-in-out cursor-pointer bg-white text-black`}
    >
      <Link href={`/profil/${formatForUrl(name)}`}>
        {isProvider && (
          <span
            className={`absolute top-[5px] left-1 ${
              online ? "bg-green-400" : "bg-red-400"
            } text-white font-extrabold text-[11px] px-1 bg-opacity-80 rounded-lg`}
          >
            {online ? "ONLINE" : "OFFLINE"}
          </span>
        )}
        <span className="flex items-center space-x-2 absolute top-[5px] right-1 bg-orange-500 text-white font-extrabold text-[13px] px-1 bg-opacity-60 rounded-lg">
          {rating}
          <FaStar />
        </span>

        {/* 🔧 FIX: Mutat butonul de delete în afara Link-ului */}
      </Link>

      {/* 🔧 FIX: Butonul de delete acum este în afara Link-ului și nu mai cauzează redirect */}
      {forAdmin && (
        <div className="absolute top-7 right-1 flex space-x-1 z-10">
          <button
            onClick={handleDeleteClick}
            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            title="Șterge utilizator"
          >
            <FaUserTimes className="w-3 h-3" />
          </button>
        </div>
      )}

      <Link href={`/profil/${formatForUrl(name)}`}>
        <Image
          src={image ? image : defaultAvatar}
          width={230}
          height={200}
          className="h-[230px] w-full object-cover rounded-b-lg"
          alt="Poza provider"
        />

        <div className="absolute flex justify-center items-center w-full -mt-[45px] h-[45px] bg-gradient-to-t from-[#000000]/70 to-transparent p-2 rounded-b-lg text-white">
          <span className="font-bold">{name}</span>
        </div>
      </Link>
      
      <div className="flex flex-col items-center space-y-2 p-2 rounded-t-xl text-white text-primaryColor">
        <span className="text-sm lg:text-md border-2 px-2 py-1 rounded-xl text-primaryColor">
          {reviews} Recenzii
        </span>
        
        {/* 🆕 AFIȘEAZĂ SUMA ÎNCASATĂ DOAR ÎN ADMIN ȘI DOAR PENTRU PROVIDERI */}
        {forAdmin && isProvider && (
          <div className="w-full bg-green-100 border-2 border-green-500 rounded-lg p-2 text-center">
            <span className="text-xs font-semibold text-green-800">VENITURI TOTALE</span>
            <div className="text-lg font-bold text-green-700">
              {formatGrossVolume(grossVolume)} RON
            </div>
          </div>
        )}

        <span className="font-bold mt-2 text-secondaryColor text-sm lg:text-sm">
          Specialitate Principala
        </span>
        <span className="flex justify-center items-center w-full bg-secondaryColor h-[20px] lg:h-[30px] text-white rounded-lg font-semibold text-sm lg:text-md">
          {speciality}
        </span>

        {/* Filtru activ evidențiat */}
        {highlightedCategory && (
          <div className="mt-2 text-sm text-center text-black">
            <span className="font-semibold text-secondaryColor">
              Căutat după {highlightedCategory.type}:
            </span>
            <div className="text-white bg-primaryColor px-2 py-1 rounded-lg font-medium mt-1">
              {highlightedCategory.name}
            </div>
          </div>
        )}

        <span className="text-semibold py-2 text-black overflow-hidden text-ellipsis h-[90px] leading-none lg:h-[50px] text-sm lg:text-md">
          {description}
        </span>

        <div className="flex flex-col justify-center bg-primaryColor/40 rounded-lg w-full h-14 lg:h-20 lg:space-y-1 font-bold">
          <p className="text-sm lg:text-md text-center hidden lg:inline">
            Programeaza o sedinta
          </p>
          <div className="flex items-center justify-center px-4 lg:px-8">
            {/* <Link href={user ? '/servicii/apel' : '/autentificare'}>
              <Icon>
                <FaPhoneVolume />
              </Icon>
            </Link> */}
            <Link
              href={user ? `/profil/${formatForUrl(name)}` : "/autentificare"}
            >
              <Icon>
                <FaVideo />
              </Icon>
            </Link>
            {/* <Link href={user ? '/servicii/mesagerie' : '/autentificare'}>
              <Icon>
                <MdMessage />
              </Icon>
            </Link> */}
          </div>
        </div>
      </div>

      {/* Setări admin */}
      {forAdmin && (
        <>
          <div className="flex flex-col px-2 gap-y-2">
            <select
              onChange={(e) => handleUserRoleChange(e)}
              defaultValue={role}
              className="w-full h-10 px-2 bg-primaryColor text-white font-bold rounded-lg"
            >
              <option value="STANDARD">Standard</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select
              onChange={(e) => handleClientRoleChange(e)}
              defaultValue={isProvider ? "Furnizor" : "Client"}
              className="w-full h-10 px-2 bg-primaryColor text-white font-bold rounded-lg"
            >
              <option value="Furnizor">Furnizor</option>
              <option value="Client">Client</option>
            </select>
            <Button
              onClick={() => setShowSettingModal(true)}
              className="bg-gradient-to-t border-2 border-buttonPrimaryColor/20 shadow-lg shadow-buttonPrimaryColor/40 from-buttonPrimaryColor to-buttonSecondaryColor px-2 lg:px-4 py-1 lg:py-2 text-md text-white font-semibold"
            >
              Setări Utilizator
            </Button>
          </div>
          <div
            className={`${
              showSettingModal ? "fixed" : "hidden"
            } top-0 left-0 w-full h-full bg-black/50 flex justify-center items-center z-50`}
          >
            <SettingsModal
              setShowSettings={(value: boolean) => setShowSettingModal(value)}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ProviderCard;