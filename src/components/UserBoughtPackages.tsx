// File: components/UserBoughtPackages.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface BoughtPackage {
  id: string;
  providerId: string;
  packageId: string;
  totalSessions: number;
  usedSessions: number;
  createdAt: string;
  expiresAt: string | null;
  providerPackage: {
    service: string;
    totalSessions: number;
    price: number;
    createdAt: string;
    expiresAt: string | null;
  };
  provider: { user: { name: string } };
}

interface SoldPackage {
  id: string;
  userId: string;
  packageId: string;
  totalSessions: number;
  usedSessions: number;
  createdAt: string;
  expiresAt: string | null;
  providerPackage: {
    service: string;
    totalSessions: number;
    price: number;
    createdAt: string;
    expiresAt: string | null;
  };
  user: { name: string };
}

interface UserBoughtPackagesProps {
  isProvider: boolean;
}

export default function UserBoughtPackages({ isProvider }: UserBoughtPackagesProps) {
  const [bought, setBought] = useState<BoughtPackage[]>([]);
  const [sold, setSold] = useState<SoldPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/user/bought-packages", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || `Status ${res.status}`);
        }
        return res.json();
      })
      .then(({ boughtPackages, soldPackages }) => {
        setBought(boughtPackages || []);
        setSold(soldPackages || []);
        setError(null);
      })
      .catch((err: any) => {
        console.error("Error fetching packages:", err);
        setError(err.message || "A apărut o eroare");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Se încarcă datele…</p>;
  if (error) return <p className="text-red-500">Eroare: {error}</p>;

  const items = isProvider ? sold : bought;
  if (!items.length) {
    return <p>{isProvider ? "Nicio vânzare încă." : "Nu ai cumpărat niciun pachet."}</p>;
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold mb-2">
        {isProvider ? "Pachetele vândute" : "Pachetele tale cumpărate"}
      </h3>
      <ul className="space-y-4">
        {items.map((pkg) => (
          <li
            key={pkg.id}
            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between">
              <div>
                <p className="text-lg font-medium">
                  {isProvider
                    ? `Client: ${(pkg as SoldPackage).user.name}`
                    : `Provider: ${(pkg as BoughtPackage).provider.user.name}`}
                </p>
                <p className="text-sm text-gray-600">
                  Tip serviciu: {pkg.providerPackage.service}
                </p>
                <p className="text-sm text-gray-600">
                  Preț: {pkg.providerPackage.price.toFixed(2)} RON
                </p>
                <p className="text-sm text-gray-600">
                  Ședințe incluse: {pkg.providerPackage.totalSessions} (
                  ai folosit {pkg.usedSessions})
                </p>
              </div>
              <div className="text-right text-sm">
                <p>Achiziționat la:</p>
                <p>
                  {new Date(pkg.createdAt).toLocaleDateString("ro-RO", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
                {pkg.expiresAt && (
                  <>
                    <p>Expiră la:</p>
                    <p>
                      {new Date(pkg.expiresAt).toLocaleDateString(
                        "ro-RO",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        }
                      )}
                    </p>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
