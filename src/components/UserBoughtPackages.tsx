// File: components/UserBoughtPackages.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { formatForUrl } from "@/utils/util";

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
  provider: {
    user: {
      name: string;
    };
  };
}

export default function UserBoughtPackages() {
  const { data: session, status } = useSession();
  const [packages, setPackages] = useState<BoughtPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch("/api/user/bought-packages", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || `Status ${res.status}`);
        }
        return res.json();
      })
      .then((json) => {
        setPackages(json.packages);
        setError(null);
      })
      .catch((err: any) => {
        console.error("Error fetching bought packages:", err);
        setError(err.message || "A apărut o eroare");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [status]);

  if (status === "loading" || loading) {
    return <p>Se încarcă pachetele cumpărate…</p>;
  }

  if (error) {
    return <p className="text-red-500">Eroare: {error}</p>;
  }

  if (!packages.length) {
    return <p>Nu ai cumpărat încă niciun pachet.</p>;
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold mb-2">Pachetele tale cumpărate</h3>
      <ul className="space-y-4">
        {packages.map((pkg) => (
          <li
            key={pkg.id}
            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition"
          >
            <div className="flex justify-between">
              <div>
                <p className="flex flex-col text-lg font-medium">
                  Pachet de la:{" "}
                  <Link href={`/profile/${pkg.provider.user.name}`} className="font-semibold">
                    {pkg.provider.user.name}
                  </Link>
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
                      {new Date(pkg.expiresAt).toLocaleDateString("ro-RO", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
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
