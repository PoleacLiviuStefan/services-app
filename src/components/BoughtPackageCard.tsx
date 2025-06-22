// File: components/BoughtPackageCard.tsx
"use client";

import React, { FC } from "react";
import { Package } from "@/interfaces/PackageInterface";

export interface BoughtPackageCardProps {
  pkg: Package;
  onBuy?: (packageId: string) => void; // optional, dacă n-ai nevoie de buton Buy aici
}

const BoughtPackageCard: FC<BoughtPackageCardProps> = ({ pkg, onBuy }) => {
  const { totalSessions } = pkg.providerPackage;
  const { usedSessions } = pkg;
  const remaining = totalSessions - usedSessions;

  const expirationText = pkg.expiresAt
    ? `Expiră ${new Date(pkg.expiresAt).toLocaleDateString("ro-RO")}`
    : "Fără expirare";

  return (
    <div className="flex justify-between items-center border border-gray-200 rounded-lg p-4 shadow-sm">
      <div>
        <h3 className="font-medium text-lg">{pkg.providerPackage.service}</h3>
        <p className="text-sm text-gray-600">
          {totalSessions} sesiuni • {expirationText} • Rămase: {remaining}
        </p>
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-primaryColor font-semibold">
          {pkg.providerPackage.price.toLocaleString("ro-RO")} RON
        </span>
        {onBuy && (
          <button
            type="button"
            className="bg-primaryColor text-white px-4 py-2 rounded-lg hover:bg-primaryColor-dark focus:outline-none focus:ring-2 focus:ring-primaryColor"
            onClick={() => onBuy(pkg.id)}
          >
            Cumpără
          </button>
        )}
      </div>
    </div>
  );
};

export default BoughtPackageCard;
