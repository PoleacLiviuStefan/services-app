"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import SearchInput from "./SearchInput";
import { SortPsychics } from "./SortPsychics";
import ProviderCard from "./providerCard";
import { FaCaretLeft, FaCaretRight } from "react-icons/fa";
import { useCatalogStore } from "@/store/catalog";
import LoadingSkeleton from "./ui/loadingSkeleton";
import Button from "./atoms/button";
import { ProviderInterface } from "@/interfaces/ProviderInterface";


const FilteredPsychics = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setFilter = useCatalogStore((s) => s.setFilter);
  const selectedFilters = useCatalogStore((s) => s.selectedFilters);

  // Extragem parametrul de speciality din URL
  const specialityParam = searchParams.get("speciality");

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

  // 1) SETĂM FILTRUL AUTOMAT după specialityParam
  useEffect(() => {
    if (specialityParam) {
      // cheia ta din store s-ar numi probabil "specialities"
      setFilter("specialities", specialityParam);
    }
  }, [specialityParam, setFilter]);

  // 2) FETCH providers ORI DE CÂTE ORI se schimbă selectedFilters
  const fetchProviders = async () => {
    setLoading(true);
    const params = new URLSearchParams();

    if (selectedFilters.specialities?.length) {
      // adăugăm fiecare specialitate selectată
      selectedFilters.specialities.forEach((s) =>
        params.append("speciality", s)
      );
    }
    if (selectedFilters.tools?.length) {
      selectedFilters.tools.forEach((t) => params.append("tool", t));
    }
    if (selectedFilters.readings?.length) {
      selectedFilters.readings.forEach((r) => params.append("reading", r));
    }
    if (searchProviders.current?.value) {
      params.set("search", searchProviders.current.value);
    }

    try {
      const res = await fetch(
        `/api/provider/get-providers?${params.toString()}`,
        { headers: { "Content-Type": "application/json" } }
      );
      if (!res.ok) throw new Error("Eroare la obținerea providerilor");
      const data = await res.json();
      setProviders(data.providers);
      console.log("Provideri obținuți:", data.providers);
    } catch (err) {
      console.error("Eroare la fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  // Apelăm fetchProviders la montare și oricând se schimbă selectedFilters
  useEffect(() => {
    fetchProviders();
  }, [selectedFilters]); // << aici

  type HighlightedCategory = {
    type: "speciality" | "tool" | "reading";
    name: string;
  };

  const highlightedCategory = useMemo<HighlightedCategory | undefined>(() => {
    if (selectedFilters.specialities?.length) {
      return { type: "speciality", name: selectedFilters.specialities[0] };
    } else if (selectedFilters.tools?.length) {
      return { type: "tool", name: selectedFilters.tools[0] };
    } else if (selectedFilters.readings?.length) {
      return { type: "reading", name: selectedFilters.readings[0] };
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
            ? Array.from({ length: 6 }).map((_, i) => (
                <LoadingSkeleton key={i} />
              ))
            : currentItems.map((provider) => (
                // inside currentItems.map(...)
                <ProviderCard
                  key={provider.id}
                  name={provider.user?.name || "N/A"}
                  image={provider.user?.image || ""}
                  rating={provider.averageRating} // use real rating
                  description={provider.description || "—"}
                  reviews={provider.reviewsCount} // number of reviews
                  speciality={provider.mainSpeciality?.name || "—"} // mainSpeciality
                  tool={provider.mainTool} // pass mainTool
                  reading={provider.reading} // pass reading
                  forAdmin={false}
                  role={provider.role}
                  isProvider={true}
                  online={provider.online}
                  highlightedCategory={highlightedCategory}
                />
              ))}
        </div>

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
            onClick={() =>
              goToPage(currentPage < totalPages - 1 ? currentPage + 1 : 0)
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
