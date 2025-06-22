"use client";

import React from "react";
import { BoughtPackage, SoldPackage } from "@/interfaces/PurchaseInterface";

interface PackageListItemProps {
  pkg: BoughtPackage | SoldPackage;
  isProvider: boolean;
}

const PackageListItem: React.FC<PackageListItemProps> = ({ pkg, isProvider }) => {
  const { providerPackage, createdAt, expiresAt, usedSessions, invoices } = pkg as any;

  return (
    <li className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
      <div className="flex justify-between">
        <div>
          <p className="text-lg font-medium">
            {isProvider
              ? `Client: ${(pkg as SoldPackage).user.name}`
              : `Astrolog: ${(pkg as BoughtPackage).provider.user.name}`}
          </p>
          <p className="text-sm text-gray-600">
            Tip serviciu: {providerPackage.service}
          </p>
          <p className="text-sm text-gray-600">
            Preț: {providerPackage.price.toFixed(2)} RON
          </p>
          <p className="text-sm text-gray-600">
            Ședințe incluse: {providerPackage.totalSessions} (Folosite: {usedSessions})
          </p>
        </div>
        <div className="text-right text-sm">
          <p>Achiziționat la:</p>
          <p>
            {new Date(createdAt).toLocaleDateString("ro-RO", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
          {expiresAt && (
            <>
              <p>Expiră la:</p>
              <p>
                {new Date(expiresAt).toLocaleDateString("ro-RO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            </>
          )}
        </div>
      </div>

      {invoices.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium">Facturi emise:</h4>
          <ul className="mt-2 space-y-1">
            {invoices.map((inv) => (
              <li key={inv.id} className="text-sm">
                <a
                  href={inv.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  {inv.number} —{" "}
                  {new Date(inv.createdAt).toLocaleDateString("ro-RO", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
};

export default PackageListItem;
