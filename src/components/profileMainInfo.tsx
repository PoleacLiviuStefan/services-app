"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaPlay, FaStar, FaVideo, FaComments } from "react-icons/fa";
import Icon from "./atoms/icon";
import Button from "./atoms/button";
import ViewVideoModal from "./ViewVideoModal";
import BuyPackageModal from "./BuyPackageModal";
import MainCharacteristic from "./ui/mainCharacteristic";
import { ProviderInterface } from "@/interfaces/ProviderInterface";
import { createConversationUrl } from "@/utils/userResolver";

interface ProfileMainInfoProps {
  provider: ProviderInterface;
}

const ProfileMainInfo: React.FC<ProfileMainInfoProps> = ({ provider }) => {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showBuyPackageModal, setShowBuyPackageModal] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // extragem serviciile unice
  const services = Array.from(
    new Set(provider.packages.map((pkg) => pkg.service))
  );

  const handleBuy = (packageId: string) => {
    console.log(`Cumpăr pachet ${packageId} pentru serviciul ${selectedService}`);
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
        providerStripeAccountId={provider.stripeAccountId || ""}
        providerId={provider.id}
        packages={provider.packages}
        selectedService={selectedService}
        isOpen={showBuyPackageModal}
        onClose={() => setShowBuyPackageModal(false)}
        onBuy={handleBuy}
      />

      <div className="flex flex-col lg:flex-row lg:justify-between items-center space-y-6 lg:space-x-6 w-full">
        {/* Profil picture & info */}
        <div className="flex flex-col items-center bg-white rounded-lg shadow-lg w-[250px] h-[300px]">
          <div className="flex flex-col items-center relative w-full h-[250px] overflow-hidden rounded-t-lg">
            <Image
              src={provider.image || "/default-avatar.webp"}
              alt={provider.name}
              fill
              className="object-cover"
            />
            {provider.online ? (
              <span className="absolute top-2 left-2 bg-green-400 text-white text-[11px] px-1 rounded-lg">
                ONLINE
              </span>
            ) : (
              <span className="absolute top-2 left-2 bg-red-400 text-white text-[11px] px-1 rounded-lg">
                OFFLINE
              </span>
            )}
            {provider.videoUrl && (
              <button
                onClick={() => setShowVideoModal(true)}
                className="absolute bottom-0 flex items-center bg-primaryColor text-white text-sm px-3 py-1 rounded-full"
              >
                <FaPlay className="mr-2" />
                Video Introductiv
              </button>
            )}
            <span className="absolute top-2 right-2 flex items-center bg-yellow-500 text-white text-sm px-2 py-1 rounded-lg">
              {provider.rating} <FaStar className="ml-1" />
              <span className="ml-2 text-xs">({provider.reviewsCount})</span>
            </span>
          </div>
          <h2 className="mt-2 text-center text-primaryColor text-xl font-bold">
            {provider.name}
          </h2>
        </div>

        {/* Caracteristici & butoane pachete */}
        <div className="flex flex-col items-center space-y-4 max-w-[500px] w-full lg:w-[500px]">
          <ul className="flex justify-center space-x-8 w-full">
            <MainCharacteristic
              label={<>Specialitate<br />Principală</>}
              characteristic={provider.mainSpecialty}
            />
            <MainCharacteristic
              label={<>Unealtă<br />Principală</>}
              characteristic={provider.mainTool}
            />
            <MainCharacteristic
              label={<>Stil<br />Citire</>}
              characteristic={provider.readingStyle}
            />
          </ul>

          {/* Butoane de acțiuni */}
          <div className="flex flex-wrap justify-center gap-4">
            {/* Buton Chat/Conversație - folosește URL-ul corect */}
            <Link href={createConversationUrl(provider.name)}>
              <Button className="flex items-center gap-2 bg-primaryColor text-white px-6 py-5 rounded-md hover:bg-secondaryColor transition-colors">
                <FaComments size={20} />
                <span>Conversație</span>
              </Button>
            </Link>

            {/* Buton Programare Video */}
            <Button
              onClick={() => {
                setSelectedService(services[0]);
                setShowBuyPackageModal(true);
              }}
              className="flex items-center gap-2 border-2 border-primaryColor text-primaryColor px-6 py-3 rounded-md hover:bg-primaryColor hover:text-white transition-all duration-300"
            >
              <FaVideo size={20} />
              <span>Cumpără Ședințe</span>
            </Button>
          </div>

          {/* Instrucțiuni */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg w-full">
            <p className="font-bold text-gray-800 mb-3">Pașii pentru a putea programa o consultație:</p>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Apasă pe butonul 'Cumpără Ședințe'</li>
              <li>Efectuează plata pentru suma afișată</li>
              <li>Apasă pe butonul 'Programare Ședință' aflat puțin mai jos și alege un interval disponibil</li>
            </ol>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfileMainInfo;