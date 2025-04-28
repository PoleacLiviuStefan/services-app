"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import SearchInput from "./SearchInput";
import { SortPsychics } from "./SortPsychics";
import ProviderCard from "./ui/providerCard";
import { FaCaretLeft, FaCaretRight } from "react-icons/fa";
import { useCatalogStore } from "@/store/catalog";
import LoadingSkeleton from "./ui/loadingSkeleton";
import Button from "./atoms/button";
import ProviderInterface from "@/interfaces/ProviderInterface";

const FilteredPsychics = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedFilters = useCatalogStore((s) => s.selectedFilters);

  const [providers, setProviders] = useState<ProviderInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const searchProviders = useRef<HTMLInputElement>(null);

  const currentPage = useMemo(() => {
    const p = searchParams.get("page");
    const n = p ? parseInt(p, 10) - 1 : 0;
    return isNaN(n) || n < 0 ? 0 : n;
  }, [searchParams]);

  const itemsPerPage = 12;
  const totalPages = Math.ceil(providers.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const currentItems = providers.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (pageIndex: number) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("page", String(pageIndex + 1));
    router.push(`${pathname}?${params.toString()}`);
  };

  const goToPrevious = () => {
    goToPage(currentPage > 0 ? currentPage - 1 : totalPages - 1);
  };

  const goToNext = () => {
    goToPage(currentPage < totalPages - 1 ? currentPage + 1 : 0);
  };

  const fetchProviders = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedFilters.speciality) {
      params.set("speciality", selectedFilters.speciality);
    }
    if (selectedFilters.tool) {
      params.set("tool", selectedFilters.tool);
    }
    if (selectedFilters.reading) {
      params.set("reading", selectedFilters.reading);
    }
    if (searchProviders.current && searchProviders.current.value !== "") {
      params.set("search", searchProviders.current.value);
    }

    try {
      const res = await fetch(
        `/api/provider/get-providers?${params.toString()}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!res.ok) throw new Error("Eroare la obținerea providerilor");
      const data = await res.json();
      setProviders(data.providers);
    } catch (error) {
      console.error("Eroare la fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type HighlightedCategory = {
    type: "speciality" | "tool" | "reading";
    name: string;
  };

  const highlightedCategory = useMemo<HighlightedCategory | undefined>(() => {
    if (selectedFilters.speciality) {
      return { type: "speciality", name: selectedFilters.speciality };
    } else if (selectedFilters.tool) {
      return { type: "tool", name: selectedFilters.tool };
    } else if (selectedFilters.reading) {
      return { type: "reading", name: selectedFilters.reading };
    }
    return undefined;
  }, [selectedFilters]);

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen w-full bg-white rounded-lg shadow-lg border-2 border-secondaryColor p-4">
      <aside className="lg:sticky lg:top-0 flex flex-col lg:w-64 lg:px-2 py-4 gap-4">
        <SearchInput ref={searchProviders} />
        <SortPsychics />
        <Button
          onClick={() => fetchProviders()}
          className="bg-gradient-to-t border-2 border-buttonPrimaryColor/20 shadow-lg shadow-buttonPrimaryColor/40 from-buttonPrimaryColor to-buttonSecondaryColor px-2 lg:px-4 py-1 lg:py-2 text-md text-white font-semibold"
        >
          Aplica Filtre
        </Button>
      </aside>

      <div className="flex flex-col items-center w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <LoadingSkeleton key={i} />)
            : currentItems.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  name={provider.user?.name || "N/A"}
                  image={provider.user?.image || "/person.avif"}
                  rating={4.5}
                  description={provider.description || "Fără descriere"}
                  reviews={Math.floor(Math.random() * 100)}
                  speciality={provider.mainSpeciality?.name || "Fără specialitate"}
                  forAdmin={false}
                  role="STANDARD"
                  isProvider={true}
                  highlightedCategory={highlightedCategory}
                />
              ))}
        </div>

        <div className="flex items-center space-x-4 mt-6">
          <button
            onClick={goToPrevious}
            className="bg-gray-400 p-2 rounded-full text-white"
          >
            <FaCaretLeft />
          </button>

          <ul className="flex space-x-2">
            {Array.from({ length: totalPages }).map((_, page) => (
              <li
                key={page}
                className={`w-7 h-7 flex justify-center items-center rounded-full cursor-pointer ${
                  page === currentPage ? "bg-gray-600" : "bg-gray-400"
                } text-white`}
                onClick={() => goToPage(page)}
              >
                {page + 1}
              </li>
            ))}
          </ul>

          <button
            onClick={goToNext}
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
