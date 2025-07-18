// components/PsychicProfile.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { formatForUrl } from "@/utils/util";
import { ProviderInterface } from "@/interfaces/ProviderInterface";
import ProfileMainInfo from "@/components/profileMainInfo";
import ProviderProfileSection from "@/components/providerProfile/ProviderProfileSection";

export default function PsychicProfile() {
  // 1. Preluăm param-ul din URL
  const params = useParams() as { name?: string };
  const rawSlug = params.name ?? "";

  // 2. Decodăm și normalizăm slug-ul exact cum a fost salvat pe server
  const decoded = decodeURIComponent(rawSlug);
  const slug = formatForUrl(decoded); // ex: "precup-carmen-cristina"

  const [provider, setProvider] = useState<ProviderInterface | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return; // dacă slug e vid, nu facem fetch
    setLoading(true);
    setError(null);

    fetch(`/api/user/${encodeURIComponent(slug)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Profilul nu a fost găsit");
        return res.json();
      })
      .then((data: any) => {
        const p = data.provider;
        // mapare la propriul DTO (ProviderInterface)
        const mainSpec = p.mainSpeciality;
        const mainTool = p.mainTool;

        const moreSpecialties = (p.specialities as any[])
          .map((s) => s.name)
          .filter((n) => n !== mainSpec?.name);
        const moreTools = (p.tools as any[])
          .map((t) => t.name)
          .filter((n) => n !== mainTool?.name);

        const reviewsList = (p.reviews as any[]) || [];
        const reviewsCount = reviewsList.length;
        const rating =
          reviewsCount > 0
            ? reviewsList.reduce((sum, r) => sum + (r.rating || 0), 0) /
              reviewsCount
            : 0;

        const mapped: ProviderInterface = {
          id: p.user.id,
          name: p.user.name,
          image: p.user.image,
          email: p.user.email,
          role: p.user.role,
          isProvider: true,
          rating,
          description: p.description,
          reviews: reviewsList,
          speciality: mainSpec?.name || "",
          mainSpeciality: mainSpec ? { name: mainSpec.name } : undefined,
          stripeAccountId: p.stripeAccountId || null,
          reviewsCount,
          online: p.online,
          videoUrl: p.videoUrl,
          title: p.description,
          mainSpecialty: mainSpec?.name || "",
          moreSpecialties,
          mainTool: mainTool?.name || "",
          moreTools,
          readingStyle: p.reading?.name || "",
          about: p.description,
          scheduleLink: `/programare/${encodeURIComponent(
            formatForUrl(p.user.name)
          )}`,
          packages: p.providerPackages,
        };
        setProvider(mapped);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="p-4 w-full lg:max-w-4xl mx-auto bg-white shadow-lg rounded-lg space-y-6">
        {/* …skeleton loading… */}
        <div className="flex flex-col lg:flex-row items-start animate-pulse space-x-4">
          <div className="bg-gray-200 rounded-lg h-[350px] w-[250px]" />
          <div className="flex-1 space-y-4 py-2">
            <div className="h-6 bg-gray-200 rounded w-3/5" />
            <div className="h-4 bg-gray-200 rounded w-2/5" />
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-10 bg-gray-200 rounded" />
          </div>
        </div>
        <div className="flex space-x-2 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-10 bg-gray-200 rounded w-1/3" />
        </div>
        <div className="space-y-4 animate-pulse">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-6 bg-gray-200 rounded w-full" />
            <div className="h-6 bg-gray-200 rounded w-3/4" />
          </div>
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) return <p>Am întâmpinat o eroare: {error}</p>;
  if (!provider) return null; // nu afișăm nimic dacă niciun provider nu a fost găsit

  return (
    <div className="flex flex-col justify-center p-4 w-full lg:max-w-4xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden gap-12 p-8">
      <ProfileMainInfo provider={provider} />
      <ProviderProfileSection provider={provider} />
    </div>
  );
}
