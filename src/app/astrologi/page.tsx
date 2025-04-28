'use client';
import React, { Suspense, useEffect } from 'react';
import FilteredPsychics from '@/components/FilteredPsychics';
import { useCatalogStore } from '@/store/catalog';

const Page = () => {

  const fetchCatalog   = useCatalogStore((s) => s.fetchCatalog);
  const selectedFilters   = useCatalogStore((s) => s.selectedFilters);
  useEffect(() => {
    fetchCatalog();
    
  }, [fetchCatalog]);
  useEffect(() => {
    console.log('Selected filters:', selectedFilters);
  }, [selectedFilters]);
  return (
    <div className="flex flex-col items-center min-h-screen w-full px-4 py-20 bg-gradient-to-t from-primaryColor to-secondaryColor">
      <div className="flex flex-col items-center lg:items-start w-full lg:w-[67rem] space-y-8">
        <h1 className="text-white font-semibold text-2xl lg:text-4xl">
          Astrologi Lorem Ipsum
        </h1>





        <Suspense fallback={<div>Loading...</div>}>
        <FilteredPsychics />
      </Suspense>
      </div>
    </div>
  );
};

export default Page;
