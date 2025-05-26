"use client";

import { Package } from "@/interfaces/PackageInterface";
import React, { FC } from "react";
import PackageCard from "./PackageCard";

export interface BuyPackageModalProps {
  /** Lista de pachete disponibile pentru cumpărare */
  packages: Package[];
  /** Controlează afișarea modalului */
  isOpen: boolean;
  /** Callback la închiderea modalului */
  onClose: () => void;
  /** Callback când user-ul selectează un pachet; primește id-ul pachetului */
  onBuy: (packageId: string) => void;
}

const BuyPackageModal: FC<BuyPackageModalProps> = ({
  packages,
  isOpen,
  onClose,
  onBuy,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-lg w-11/12 md:w-2/3 lg:w-1/2 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl font-bold"
          onClick={onClose}
        >
          &times;
        </button>

        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Alege un pachet de sesiuni
          </h2>

          <div className="space-y-4">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} onBuy={onBuy} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyPackageModal;
