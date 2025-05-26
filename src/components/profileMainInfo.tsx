"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { FaPlay, FaStar, FaVideo } from "react-icons/fa";
import { MdMessage } from "react-icons/md";
import Icon from "./atoms/icon";
import Button from "./atoms/button";
import ViewVideoModal from "./ViewVideoModal";
import BuyPackageModal from "./BuyPackageModal";
import MainCharacteristic from "./ui/mainCharacteristic";
import { ProviderInterface } from "@/interfaces/ProviderInterface";

interface ProfileMainInfoProps {
  provider: ProviderInterface;
}

const ProfileMainInfo: React.FC<ProfileMainInfoProps> = ({ provider }) => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showBuyPackageModal, setShowBuyPackageModal] = useState(false);
  const [selectedService, setSelectedService] = useState<
    "CHAT" | "MEET" | null
  >(null);

  // Filtrăm pachetele după tip de serviciu
  const chatPackages = provider.packages.filter((p) => p.service === "CHAT");
  const meetPackages = provider.packages.filter((p) => p.service === "MEET");

  const handleBuy = (packageId: string) => {
    // TODO: implementează logica de achiziție, ex: apel API
    console.log(`Cumpăr pachet ${packageId}`);
    setShowBuyPackageModal(false);
  };

  return (
    <>
      <ViewVideoModal
        videoUrl={provider.videoUrl || ""}
        isOpen={showVideoModal}
        onClose={() => setShowVideoModal(false)}
      />
      <BuyPackageModal
        packages={selectedService === "CHAT" ? chatPackages : meetPackages}
        isOpen={showBuyPackageModal}
        onClose={() => setShowBuyPackageModal(false)}
        onBuy={handleBuy}
      />

      <div className="flex flex-col lg:flex-row lg:justify-between items-center space-y-6 lg:space-x-6 relative w-full">
        <div className="relative flex flex-col bg-white rounded-lg shadow-lg h-[350px] w-[250px]">
          <Image
            src={provider.image}
            alt={provider.name}
            height={300}
            width={250}
            className="object-cover rounded-lg"
          />
          <div className="flex flex-col p-2">
            {provider.online ? (
              <span className="absolute top-2 left-2 bg-green-400 text-white font-extrabold text-[11px] px-1 bg-opacity-80 rounded-lg">
                ONLINE
              </span>
            ) : (
              <span className="absolute top-2 left-2 bg-red-400 text-white font-extrabold text-[11px] px-1 bg-opacity-80 rounded-lg">
                OFFLINE
              </span>
            )}
            {provider.videoUrl && (
              <Button
                onClick={() => setShowVideoModal(true)}
                className="flex items-center justify-center bg-primaryColor text-white font-semibold text-sm px-3 py-1 rounded-full"
              >
                <FaPlay className="mr-2" /> Video Introductiv
              </Button>
            )}
            <span className="absolute top-1 right-1 flex items-center bg-yellow-500 text-white font-semibold text-sm px-2 py-1 rounded-lg">
              {provider.rating} <FaStar className="ml-1" />
              <span className="ml-2 text-xs">({provider.reviewsCount})</span>
            </span>
          </div>
          <div className="relative flex flex-col">
            <h2 className="text-center text-primaryColor text-xl font-bold">
              {provider.name}
            </h2>
          </div>
        </div>

        {/* Caracteristici principale */}
        <div className="flex flex-col justify-center items-center space-y-4 max-w-[500px] w-full lg:w-[500px]">
          <ul className="flex flex-row justify-between lg:justify-center lg:space-x-8 w-full">
            <MainCharacteristic
              label={
                <>
                  Specialitate
                  <br />
                  Principala
                </>
              }
              characteristic={provider.mainSpecialty}
            />
            <MainCharacteristic
              label={
                <>
                  Unealtă
                  <br />
                  Principala
                </>
              }
              characteristic={provider.mainTool}
            />
            <MainCharacteristic
              label={
                <>
                  Stil
                  <br />
                  Citire
                </>
              }
              characteristic={provider.readingStyle}
            />
          </ul>

          {/* Butoane pachete */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={() => {
                setSelectedService("CHAT");
                setShowBuyPackageModal(true);
              }}
              disabled={chatPackages.length === 1}
            >
              <Icon>
                <FaVideo />
              </Icon>
            </Button>
            <Button
              onClick={() => {
                setSelectedService("MEET");
                setShowBuyPackageModal(true);
              }}
              disabled={meetPackages.length === 2}
            >
              <Icon>
                <MdMessage />
              </Icon>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileMainInfo;
