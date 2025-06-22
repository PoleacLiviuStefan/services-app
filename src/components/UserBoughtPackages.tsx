// File: components/UserBoughtPackages.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import PackageListItem from "./PackageListItem";
import { BoughtPackage, SoldPackage } from "@/interfaces/PurchaseInterface";

interface UserBoughtPackagesProps {
  isProvider: boolean;
}

enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

export default function UserBoughtPackages({ isProvider }: UserBoughtPackagesProps) {
  // 1. State hooks
  const [bought, setBought] = useState<BoughtPackage[]>([]);
  const [sold, setSold] = useState<SoldPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);
  const [activeTab, setActiveTab] = useState<'all' | 'consumed' | 'unconsumed'>("all");
  const [currentPage, setCurrentPage] = useState(1);

  // 2. Fetch data
  useEffect(() => {
    setLoading(true);
    fetch("/api/user/bought-packages", { credentials: "include" })
      .then(async res => {
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
      .catch(err => {
        console.error("Error fetching packages:", err);
        setError(err.message || "A apărut o eroare");
      })
      .finally(() => setLoading(false));
  }, []);

  // 3. Derived data
  const items = useMemo(() => (isProvider ? sold : bought), [isProvider, sold, bought]);

  const filteredByTab = useMemo(() => {
    return items.filter(pkg => {
      if (activeTab === 'consumed') {
        return (pkg.usedSessions ?? 0) >= pkg.providerPackage.totalSessions;
      }
      if (activeTab === 'unconsumed') {
        return (pkg.usedSessions ?? 0) < pkg.providerPackage.totalSessions;
      }
      return true;
    });
  }, [items, activeTab]);

  const filteredItems = useMemo(() => {
    return filteredByTab.filter(pkg => {
      const name = isProvider
        ? (pkg as SoldPackage).user.name
        : (pkg as BoughtPackage).provider.user.name;
      if (searchText && !name.toLowerCase().includes(searchText.toLowerCase())) {
        return false;
      }
      const createdISO = new Date(pkg.createdAt).toISOString().slice(0,10);
      if (startDate && createdISO < startDate) return false;
      if (endDate && createdISO > endDate) return false;
      return true;
    });
  }, [filteredByTab, searchText, startDate, endDate, isProvider]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return sortOrder === SortOrder.ASC ? ta - tb : tb - ta;
    });
  }, [filteredItems, sortOrder]);

  const pageSize = 5;
  const totalPages = Math.ceil(sortedItems.length / pageSize);
  const paginatedItems = useMemo(() => sortedItems.slice((currentPage - 1) * pageSize, currentPage * pageSize), [sortedItems, currentPage]);

  // 4. Event handlers
  const resetPage = () => setCurrentPage(1);
  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchText(e.target.value); resetPage(); };
  const onStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { setStartDate(e.target.value); resetPage(); };
  const onEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => { setEndDate(e.target.value); resetPage(); };
  const toggleSort = () => setSortOrder(o => o === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC);
  const changeTab = (tab: 'all' | 'consumed' | 'unconsumed') => { setActiveTab(tab); resetPage(); };

  // 5. Conditional UI
  if (loading) return <p>Se încarcă datele…</p>;
  if (error)   return <p className="text-red-500">Eroare: {error}</p>;
  if (!items.length) {
    return <p>{isProvider ? "Nicio vânzare încă." : "Nu ai cumpărat niciun pachet."}</p>;
  }

  // 6. Render
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h3 className="text-xl font-semibold mb-2">
        {isProvider ? "Pachetele vândute" : "Pachetele tale cumpărate"}
      </h3>

      {/* Tabs */}
      <div className="flex space-x-2 mb-4">
        <button onClick={() => changeTab('all')} className={`px-3 py-1 rounded ${activeTab === 'all' ? 'bg-primaryColor text-white' : 'bg-gray-200'}`}>Toate</button>
        <button onClick={() => changeTab('unconsumed')} className={`px-3 py-1 rounded ${activeTab === 'unconsumed' ? 'bg-primaryColor text-white' : 'bg-gray-200'}`}>Neconsumate</button>
        <button onClick={() => changeTab('consumed')} className={`px-3 py-1 rounded ${activeTab === 'consumed' ? 'bg-primaryColor text-white' : 'bg-gray-200'}`}>Consumate</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input type="text" placeholder={isProvider ? "Caută după nume client..." : "Caută după nume astrolog..."} value={searchText} onChange={onSearchChange} className="flex-1 border p-2 rounded" />
        <input type="date" value={startDate} onChange={onStartDateChange} className="border p-2 rounded" />
        <input type="date" value={endDate} onChange={onEndDateChange} className="border p-2 rounded" />
        <button onClick={toggleSort} className="px-3 py-1 border rounded">Sortare: {sortOrder.toUpperCase()}</button>
      </div>

      {/* List */}
      <ul className="space-y-4">
        {paginatedItems.map(pkg => (
          <PackageListItem key={pkg.id} pkg={pkg} isProvider={isProvider} />
        ))}
      </ul>

      {/* Pagination */}
      <div className="flex justify-center items-center space-x-4 mt-4">
        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Anterior</button>
        <span>Pagina {currentPage} din {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50">Următor</button>
      </div>
    </div>
  );
}
