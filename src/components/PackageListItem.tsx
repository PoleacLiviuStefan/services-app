"use client";

import React from "react";
import { BoughtPackage, SoldPackage } from "@/interfaces/PurchaseInterface";
import { useTranslation } from "@/hooks/useTranslation";
interface PackageListItemProps {
  pkg: BoughtPackage | SoldPackage;
  isProvider: boolean;
}

const PackageListItem: React.FC<PackageListItemProps> = ({ pkg, isProvider }) => {
  const { providerPackage, createdAt, expiresAt, usedSessions, invoices } = pkg as any;
  const { t } = useTranslation();;

  return (
    <li className="border rounded-lg p-4 shadow-sm hover:shadow-md transition">
      <div className="flex justify-between">
        <div>
          <p className="text-lg font-medium">
            {isProvider
              ? `${t('userBoughtPackages.clientMode')}: ${(pkg as SoldPackage).user.name}`
              : `${t('providerCard.provider')}: ${(pkg as BoughtPackage).provider.user.name}`}
          </p>
          <p className="text-sm text-gray-600">
            {t('providerDetails.service')}: {providerPackage.service}
          </p>
          <p className="text-sm text-gray-600">
            {t('providerDetails.price')}: {providerPackage.price.toFixed(2)} RON
          </p>
          <p className="text-sm text-gray-600">
            {t('providerDetails.sessionTypes')}: {providerPackage.totalSessions} ({t('userBoughtPackages.consumed')}: {usedSessions})
          </p>
        </div>
        <div className="text-right text-sm">
          <p>{t('userBoughtPackages.purchasedPackages')}:</p>
          <p>
            {new Date(createdAt).toLocaleDateString("ro-RO", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </p>
          {expiresAt && (
            <>
              <p>{t('userBoughtPackages.soldAsProvider')}:</p>
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
          <h4 className="font-medium">{t('userBoughtPackages.invoicesIssued') || 'Facturi emise:'}</h4>
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
