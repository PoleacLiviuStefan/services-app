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

// 🆕 Tip pentru vizualizare
type ViewMode = 'client' | 'provider';

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
  
  // 🆕 State pentru modul de vizualizare (doar pentru provideri)
  const [viewMode, setViewMode] = useState<ViewMode>('client');

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

  // 3. Derived data - 🆕 Logica actualizată pentru provider cu două moduri
  const items = useMemo(() => {
    if (!isProvider) {
      // Pentru utilizatori normali, doar pachetele cumpărate
      return bought;
    }
    
    // Pentru provideri, în funcție de modul selectat
    return viewMode === 'client' ? bought : sold;
  }, [isProvider, viewMode, bought, sold]);

  // 🆕 Determină dacă afișăm date ca provider în modul curent
  const isCurrentlyViewingAsProvider = isProvider && viewMode === 'provider';

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
      const name = isCurrentlyViewingAsProvider
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
  }, [filteredByTab, searchText, startDate, endDate, isCurrentlyViewingAsProvider]);

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
  
  // 🆕 Handler pentru schimbarea modului de vizualizare
  const changeViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    setActiveTab('all'); // Reset tab când schimbăm modul
    setSearchText(''); // Reset search
    resetPage();
  };

  // 5. Conditional UI
  if (loading) return <p className="text-center text-gray-500 w-full">Se încarcă datele…</p>;
  if (error) return <p className="text-red-500">Eroare: {error}</p>;

  // 🆕 Verifică dacă utilizatorul nu are pachete în modul curent
  const hasNoItems = !items.length;
  if (hasNoItems) {
    let noItemsMessage = "";
    if (!isProvider) {
      noItemsMessage = "Nu ai cumpărat niciun pachet.";
    } else {
      noItemsMessage = viewMode === 'client' 
        ? "Nu ai cumpărat niciun pachet ca client."
        : "Nicio vânzare încă ca furnizor.";
    }
    
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        {/* 🆕 Butoane pentru provider */}
        {isProvider && (
          <div className="flex justify-center space-x-2 mb-6">
            <button
              onClick={() => changeViewMode('client')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'client'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              📦 Ca Client
            </button>
            <button
              onClick={() => changeViewMode('provider')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'provider'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              💼 Ca Furnizor
            </button>
          </div>
        )}
        
        <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-4xl mb-4">
            {viewMode === 'client' ? '🛍️' : '💰'}
          </div>
          <p className="text-gray-500 text-lg">{noItemsMessage}</p>

        </div>
      </div>
    );
  }

  // 6. Render principal
  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* 🆕 Butoane pentru modul de vizualizare (doar pentru provideri) */}
      {isProvider && (
        <div className="flex justify-center space-x-2 mb-6">
          <button
            onClick={() => changeViewMode('client')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'client'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            📦 Ca Client
            {bought.length > 0 && (
              <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                {bought.length}
              </span>
            )}
          </button>
          <button
            onClick={() => changeViewMode('provider')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'provider'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            💼 Ca Furnizor
            {sold.length > 0 && (
              <span className="ml-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                {sold.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Titlu dinamic */}
      <h3 className="text-xl font-semibold mb-2">
        {!isProvider 
          ? "Pachetele tale cumpărate" 
          : viewMode === 'client' 
            ? "Pachetele cumpărate (ca client)"
            : "Pachetele vândute (ca furnizor)"
        }
      </h3>

      {/* Statistici rapide */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">{items.length}</div>
            <div className="text-sm text-gray-600">Total</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {items.filter(pkg => (pkg.usedSessions ?? 0) < pkg.providerPackage.totalSessions).length}
            </div>
            <div className="text-sm text-gray-600">Active</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {items.filter(pkg => (pkg.usedSessions ?? 0) >= pkg.providerPackage.totalSessions).length}
            </div>
            <div className="text-sm text-gray-600">Consumate</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-4">
        <button 
          onClick={() => changeTab('all')} 
          className={`px-3 py-1 rounded ${
            activeTab === 'all' ? 'bg-primaryColor text-white' : 'bg-gray-200'
          }`}
        >
          Toate ({items.length})
        </button>
        <button 
          onClick={() => changeTab('unconsumed')} 
          className={`px-3 py-1 rounded ${
            activeTab === 'unconsumed' ? 'bg-primaryColor text-white' : 'bg-gray-200'
          }`}
        >
          Active ({items.filter(pkg => (pkg.usedSessions ?? 0) < pkg.providerPackage.totalSessions).length})
        </button>
        <button 
          onClick={() => changeTab('consumed')} 
          className={`px-3 py-1 rounded ${
            activeTab === 'consumed' ? 'bg-primaryColor text-white' : 'bg-gray-200'
          }`}
        >
          Consumate ({items.filter(pkg => (pkg.usedSessions ?? 0) >= pkg.providerPackage.totalSessions).length})
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <input 
          type="text" 
          placeholder={isCurrentlyViewingAsProvider ? "Caută după nume client..." : "Caută după nume furnizor..."} 
          value={searchText} 
          onChange={onSearchChange} 
          className="flex-1 border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
        />
        <input 
          type="date" 
          value={startDate} 
          onChange={onStartDateChange} 
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
        />
        <input 
          type="date" 
          value={endDate} 
          onChange={onEndDateChange} 
          className="border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
        />
        <button 
          onClick={toggleSort} 
          className="px-3 py-1 border rounded hover:bg-gray-50 transition-colors"
        >
          Sortare: {sortOrder.toUpperCase()}
        </button>
      </div>

      {/* Rezultate filtrate */}
      {sortedItems.length === 0 ? (
        <div className="text-center p-6 bg-gray-50 rounded-lg">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-gray-500">Nu s-au găsit pachete cu criteriile selectate.</p>
          <button 
            onClick={() => {
              setSearchText('');
              setStartDate('');
              setEndDate('');
              setActiveTab('all');
              resetPage();
            }}
            className="mt-2 text-blue-500 hover:text-blue-700 underline"
          >
            Resetează filtrele
          </button>
        </div>
      ) : (
        <>
          {/* List */}
          <ul className="space-y-4">
            {paginatedItems.map(pkg => (
              <PackageListItem 
                key={pkg.id} 
                pkg={pkg} 
                isProvider={isCurrentlyViewingAsProvider} 
              />
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-4 mt-6">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
              >
                ← Anterior
              </button>
              
              {/* Page numbers */}
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 rounded transition-colors ${
                      currentPage === page 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages} 
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition-colors"
              >
                Următor →
              </button>
            </div>
          )}
        </>
      )}

      {/* Footer info */}
      <div className="text-center text-sm text-gray-500 mt-6 p-4 bg-gray-50 rounded-lg">
        <p>
          Afișează {paginatedItems.length} din {sortedItems.length} pachete
          {sortedItems.length !== items.length && ` (filtrate din ${items.length} total)`}
        </p>
      </div>
    </div>
  );
}