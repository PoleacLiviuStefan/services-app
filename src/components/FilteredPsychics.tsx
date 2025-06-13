// File: components/FilteredPsychics.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import SearchInput from "./SearchInput";
import { SortPsychics } from "./SortPsychics";
import ProviderCard from "./providerCard";
import { FaCaretLeft, FaCaretRight } from "react-icons/fa";
import LoadingSkeleton from "./ui/loadingSkeleton";
import Button from "./atoms/button";
import { ProviderInterface } from "@/interfaces/ProviderInterface";

const FilteredPsychics = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchInput = useRef<HTMLInputElement>(null);

  const [providers, setProviders] = useState<ProviderInterface[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagina curentă din URL
  const pageParam = searchParams.get("page") ?? "1";
  const currentPage = Math.max(parseInt(pageParam, 10) - 1, 0);

  const itemsPerPage = 12;
  const totalPages = Math.ceil(providers.length / itemsPerPage);
  const currentItems = providers.slice(
    currentPage * itemsPerPage,
    currentPage * itemsPerPage + itemsPerPage
  );

  // Navigare paginare
  const goToPage = (idx: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(idx + 1));
    router.push(`${pathname}?${params.toString()}`);
  };

  // Fetch bazat exclusiv pe URL
  const fetchProviders = async () => {
    setLoading(true);
    const params = new URLSearchParams(searchParams.toString());

    // search term
    const term = searchInput.current?.value;
    if (term) params.set("search", term);
    else params.delete("search");

    try {
      const res = await fetch(`/api/provider/get-providers?${params.toString()}`);
      if (!res.ok) throw new Error("Eroare la obținerea providerilor");
      const json = await res.json();
      setProviders(json.providers || []);
    } catch (e) {
      console.error(e);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  // Relaunch fetch la orice schimbare de URL
  useEffect(() => {
    fetchProviders();
  }, [searchParams]);

  // Highlighted category
  type HC = { type: "speciality" | "tool" | "reading" | "service"; name: string };
  const highlighted = useMemo<HC | undefined>(() => {
    for (const k of ["speciality", "tool", "reading", "service"] as HC["type"][]) {
      const all = searchParams.getAll(k);
      if (all.length) return { type: k, name: all[0] };
    }
    return undefined;
  }, [searchParams]);

  // 𝗡𝗢𝗨: handler reset
  const resetFilters = () => {
    // golim search input
    if (searchInput.current) searchInput.current.value = "";
    // navigăm fără niciun query param
    router.push(pathname);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen w-full bg-white rounded-lg shadow-lg border-2 border-secondaryColor p-4">
      {/* Sidebar */}
      <aside className="lg:sticky lg:top-0 flex flex-col lg:w-64 lg:px-2 py-4 gap-4">
        <SearchInput ref={searchInput} onEnter={fetchProviders} />
        <Button
          onClick={fetchProviders}
          className="bg-gradient-to-t border-2 border-buttonPrimaryColor/20 shadow-lg shadow-buttonPrimaryColor/40 from-buttonPrimaryColor to-buttonSecondaryColor px-2 lg:px-4 py-1 lg:py-2 text-md text-white font-semibold"
        >
          Caută după nume
        </Button>

        {/* butonul de reset */}

        <SortPsychics />
        <Button
          onClick={resetFilters}
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-2 lg:px-4 py-1 lg:py-2 text-md font-semibold rounded"
        >
          Resetează filtre
        </Button>
      </aside>

      {/* Grid */}
      <div className="flex flex-col items-center w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <LoadingSkeleton key={i} />)
            : currentItems.map((p) => (
                <ProviderCard
                  key={p.id}
                  name={p.user?.name || "N/A"}
                  image={p.user?.image || ""}
                  rating={p.averageRating}
                  description={p.description || "—"}
                  reviews={p.reviewsCount}
                  speciality={p.mainSpeciality?.name || "—"}
                  tool={p.mainTool}
                  reading={p.reading}
                  service={p.providerPackages?.[0]?.service}
                  forAdmin={false}
                  role={p.user.role}
                  isProvider
                  online={p.online}
                  highlightedCategory={highlighted}
                />
              ))}
        </div>

        {/* Paginare */}
        <div className="flex items-center space-x-4 mt-6">
          <button
            onClick={() =>
              goToPage(currentPage > 0 ? currentPage - 1 : totalPages - 1)
            }
            className="bg-gray-400 p-2 rounded-full text-white"
          >
            <FaCaretLeft />
          </button>
          <ul className="flex space-x-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <li
                key={i}
                className={`w-7 h-7 flex justify-center items-center rounded-full cursor-pointer ${
                  i === currentPage ? "bg-gray-600" : "bg-gray-400"
                } text-white`}
                onClick={() => goToPage(i)}
              >
                {i + 1}
              </li>
            ))}
          </ul>
          <button
            onClick={() =>
              goToPage(
                currentPage < totalPages - 1 ? currentPage + 1 : 0
              )
            }
            className="bg-gray-400 p-2 rounded-full text-white"
          >
            <FaCaretRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FilteredPsychics;
