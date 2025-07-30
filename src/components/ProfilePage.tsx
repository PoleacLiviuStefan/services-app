// File: components/ProfilePage.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import ModalPortal from "@/components/ModalPortal"; // Import the ModalPortal component
import AdminPsychics from "@/components/AdminPsychics";
import handleLogout from "@/lib/api/logout/logout";
import defaultAvatar from "../../public/default-avatar.webp";
import ProviderDetails from "@/components/ProviderDetails";
import Button from "@/components/atoms/button";
import UserBoughtPackages from "./UserBoughtPackages";
import UserSessions from "./UserSessions";
import UserBillingDetails from "./UserBillingDetails";
import UserConversations from "./UserConversations";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/utils/cropImage";
import { formatForUrl } from "@/utils/helper";

interface ProviderProfile {
  id: string;
  online: boolean;
  description: string;
  videoUrl?: string | null;
  grossVolume?: number | null;
  calendlyCalendarUri?: string | null;
  isCalendlyConnected?: boolean;
  scheduleLink?: string | null;
  reading?: { id: string; name: string; description?: string };
  specialities: {
    id: string;
    name: string;
    description?: string;
    price?: number;
  }[];
  tools: { id: string; name: string; description?: string }[];
  mainSpeciality?: { id: string; name: string };
  mainTool?: { id: string; name: string };
  reviewsCount: number;
  averageRating: number;
  providerPackages: {
    id: string;
    service: string;
    totalSessions: number;
    price: number;
    createdAt: string;
    expiresAt: string | null;
  }[];
  stripeAccountId?: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

type Tab = "packages" | "sessions" | "billing" | "conversatii";

// 🆕 Skeleton Components
const ProfileCardSkeleton = () => (
  <div className="max-w-md mx-auto bg-white shadow rounded p-6 text-center animate-pulse">
    {/* Avatar skeleton */}
    <div className="w-24 h-24 mx-auto bg-gray-300 rounded-full"></div>
    
    {/* Name skeleton */}
    <div className="mt-4 space-y-2">
      <div className="h-6 w-32 bg-gray-300 rounded mx-auto"></div>
      <div className="h-4 w-24 bg-gray-300 rounded mx-auto"></div>
    </div>
    
    {/* Email skeleton */}
    <div className="h-4 w-48 bg-gray-300 rounded mx-auto mt-2"></div>
    
    {/* Buttons skeleton */}
    <div className="flex justify-center space-x-4 mt-4">
      <div className="h-10 w-32 bg-gray-300 rounded"></div>
      <div className="h-10 w-24 bg-gray-300 rounded"></div>
    </div>
  </div>
);

const TabsSkeleton = () => (
  <div className="w-full lg:max-w-4xl mx-auto animate-pulse">
    <nav className="mb-8">
      <div className="flex justify-center">
        <div className="grid grid-cols-2 lg:inline-flex bg-gray-100 rounded-2xl p-2">
          {[1, 2, 3, 4].map((index) => (
            <div key={index} className="px-6 py-3 rounded-xl flex items-center gap-2.5 min-w-[130px] justify-center">
              <div className="w-8 h-8 rounded-full bg-gray-300"></div>
              <div className="h-4 w-16 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </nav>
  </div>
);

const TabContentSkeleton = ({ activeTab }: { activeTab: Tab }) => {
  if (activeTab === "packages") {
    return (
      <div className="space-y-4 max-w-2xl mx-auto animate-pulse">
        {/* Header skeleton similar to UserBoughtPackages */}
        <div className="h-6 w-64 bg-gray-300 rounded mb-4"></div>
        
        {/* Stats skeleton */}
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-8 w-12 bg-gray-300 rounded mx-auto"></div>
                <div className="h-4 w-16 bg-gray-300 rounded mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Tabs skeleton */}
        <div className="flex space-x-2 mb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-20 bg-gray-300 rounded"></div>
          ))}
        </div>
        
        {/* Content skeleton */}
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border rounded-lg p-4 bg-white">
              <div className="h-5 w-48 bg-gray-300 rounded mb-2"></div>
              <div className="h-4 w-32 bg-gray-300 rounded mb-3"></div>
              <div className="h-2 w-full bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === "sessions") {
    return (
      <div className="space-y-4 max-w-4xl mx-auto animate-pulse">
        {/* Filters skeleton */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="h-10 flex-1 bg-gray-300 rounded min-w-48"></div>
          <div className="h-10 w-32 bg-gray-300 rounded"></div>
          <div className="h-10 w-24 bg-gray-300 rounded"></div>
        </div>
        
        {/* Sessions list skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="border rounded-lg p-4 bg-white">
              <div className="flex justify-between items-start mb-3">
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-gray-300 rounded"></div>
                  <div className="h-4 w-32 bg-gray-300 rounded"></div>
                </div>
                <div className="h-6 w-20 bg-gray-300 rounded"></div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-24 bg-gray-300 rounded"></div>
                <div className="h-8 w-20 bg-gray-300 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === "conversatii") {
    return (
      <div className="space-y-4 max-w-2xl mx-auto animate-pulse">
        {/* Search skeleton */}
        <div className="h-10 w-full bg-gray-300 rounded mb-4"></div>
        
        {/* Conversations list skeleton */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
              <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-300 rounded"></div>
                <div className="h-3 w-48 bg-gray-300 rounded"></div>
              </div>
              <div className="h-3 w-12 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === "billing") {
    return (
      <div className="space-y-6 max-w-2xl mx-auto animate-pulse">
        {/* Form skeleton */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div className="h-6 w-48 bg-gray-300 rounded mb-4"></div>
          
          {/* Form fields */}
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-gray-300 rounded"></div>
              <div className="h-10 w-full bg-gray-300 rounded"></div>
            </div>
          ))}
          
          {/* Button */}
          <div className="h-10 w-32 bg-gray-300 rounded"></div>
        </div>
      </div>
    );
  }

  return null;
};

const ProviderDetailsSkeleton = () => (
  <div className="max-w-4xl mx-auto mt-10 space-y-6 animate-pulse">
    {/* Header */}
    <div className="h-8 w-48 bg-gray-300 rounded"></div>
    
    {/* Provider info card */}
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <div className="flex items-start space-x-4">
        <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-6 w-40 bg-gray-300 rounded"></div>
          <div className="h-4 w-32 bg-gray-300 rounded"></div>
          <div className="h-4 w-56 bg-gray-300 rounded"></div>
        </div>
        <div className="h-6 w-20 bg-gray-300 rounded"></div>
      </div>
    </div>
    
    {/* Stats cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white rounded-lg border p-4 space-y-3">
          <div className="h-5 w-24 bg-gray-300 rounded"></div>
          <div className="h-8 w-16 bg-gray-300 rounded"></div>
          <div className="h-4 w-32 bg-gray-300 rounded"></div>
        </div>
      ))}
    </div>
    
    {/* Packages */}
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <div className="h-6 w-32 bg-gray-300 rounded"></div>
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="border rounded p-3 space-y-2">
            <div className="h-5 w-40 bg-gray-300 rounded"></div>
            <div className="h-4 w-24 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const AdminSkeleton = () => (
  <div className="max-w-3xl mx-auto mt-10 animate-pulse">
    <div className="h-6 w-48 bg-gray-300 rounded mb-4"></div>
    
    {/* Admin table skeleton */}
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="h-10 w-64 bg-gray-300 rounded"></div>
      </div>
      
      <div className="divide-y">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
              <div className="space-y-1">
                <div className="h-4 w-32 bg-gray-300 rounded"></div>
                <div className="h-3 w-48 bg-gray-300 rounded"></div>
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="h-8 w-16 bg-gray-300 rounded"></div>
              <div className="h-8 w-20 bg-gray-300 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// 🆕 Main ProfilePage Skeleton
const ProfilePageSkeleton = ({ showProvider = false, showAdmin = false, activeTab = "packages" }) => (
  <div className="flex flex-col space-y-10 p-6">
    <ProfileCardSkeleton />
    <TabsSkeleton />
    <TabContentSkeleton activeTab={activeTab} />
    {showProvider && <ProviderDetailsSkeleton />}
    {showAdmin && <AdminSkeleton />}
  </div>
);

const ProfilePage: React.FC = () => {
  const { data: session, status, update: refreshSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine initial tab from ?tab= query
  const paramTab = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(paramTab ?? "packages");

  // Sync tab if URL changes
  useEffect(() => {
    const t = searchParams.get("tab") as Tab;
    if (
      t === "packages" ||
      t === "sessions" ||
      t === "billing" ||
      t === "conversatii"
    ) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSavingName, setIsSavingName] = useState(false);

  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status !== "loading" && !session?.user) {
      router.push("/autentificare");
    }
  }, [session, status, router]);

  // Build slug for fetching provider
  const slug = session?.user?.name ? formatForUrl(session.user.name) : null;

// 🔧 2. MODIFICĂ funcția fetchProviderBySlug pentru debugging mai bun:
const fetchProviderBySlug = async () => {
  if (!slug) {
    console.log("❌ Nu există slug pentru căutare");
    setProvider(null);
    setLoadingProvider(false);
    return;
  }
  
  console.log("🔍 Căutare provider pentru utilizatorul:", session?.user?.name);
  console.log("🏷️ Slug generat:", slug);
  
  setLoadingProvider(true);
  try {
    const apiUrl = `/api/user/${encodeURIComponent(slug)}`;
    console.log("📡 Apel API către:", apiUrl);
    
    const res = await fetch(apiUrl, { credentials: "include" });
    
    console.log("📊 Răspuns API:", res.status, res.statusText);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.log("❌ Eroare API:", errorText);
      setProvider(null);
    } else {
      const data = await res.json();
      console.log("✅ Date primite:", data);
      setProvider(data.provider as ProviderProfile);
    }
  } catch (err) {
    console.error("💥 Eroare în fetch:", err);
    setProvider(null);
  } finally {
    setLoadingProvider(false);
  }
};


  useEffect(() => {
    if (status === "authenticated" && slug) fetchProviderBySlug();
  }, [status, slug]);

  // Handle OAuth callback for Stripe/Calendly
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (status === "authenticated" && slug && code && state) {
      const [type, provId] = state.split(":");
      (async () => {
        const url =
          type === "stripe"
            ? `/api/provider/${provId}/stripe-connect/callback?code=${code}`
            : `/api/provider/${provId}/calendly-connect/callback?code=${code}`;
        const resp = await fetch(url);
        if (!resp.ok) console.error(await resp.text());
        else await fetchProviderBySlug();
        router.replace("/profil", { scroll: false });
      })();
    }
  }, [searchParams, status, slug, router]);

  // Admin: fetch all users
  useEffect(() => {
    if (session?.user.role === "ADMIN") {
      fetch("/api/admin/get-users", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
        .then((data) => setUsers(data.users))
        .catch(console.error);
    }
  }, [session]);

  // Clean function to close modal and reset all states
  const closeAvatarModal = () => {
    setShowAvatarModal(false);
    setSelectedFile(null);
    setImagePreview(null);
    setUploadError(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  // Avatar crop handlers
  const onCropComplete = (_: any, pixels: any) => setCroppedAreaPixels(pixels);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleAvatarSave = async () => {
    if (!selectedFile || !provider || !croppedAreaPixels || !imagePreview)
      return;
    setIsUploading(true);
    try {
      const blob = await getCroppedImg(
        imagePreview,
        croppedAreaPixels,
        selectedFile.type
      );
      const file = new File([blob], selectedFile.name, {
        type: selectedFile.type,
      });
      const formData = new FormData();
      formData.append("avatar", file);
      const res = await fetch(`/api/provider/${provider.id}/avatar`, {
        method: "PUT",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const { imageUrl } = await res.json();
      setProvider((p) => p && { ...p, user: { ...p.user, image: imageUrl } });
      closeAvatarModal();
    } catch {
      setUploadError("Eroare la upload");
    } finally {
      setIsUploading(false);
    }
  };

  // Name edit handlers
  const handleEditNameClick = () => {
    if (!provider) return;
    setNameError(null);
    setEditedName(provider.user.name);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || !provider)
      return setNameError("Numele nu poate fi gol.");
    setIsSavingName(true);
    try {
      const res = await fetch(`/api/provider/${provider.id}/update-name`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editedName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        setNameError(err.error || "Eroare la salvare");
      } else {
        await fetchProviderBySlug();
        await refreshSession();
        setIsEditingName(false);
      }
    } catch {
      setNameError("Eroare de rețea");
    } finally {
      setIsSavingName(false);
    }
  };

  // Function to update URL with selected tab
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  // Simplified AvatarModal component (without portal logic, that's handled by ModalPortal)
  const AvatarModal = () => (
    <div 
      className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100 max-h-[90vh] overflow-y-auto"
      onClick={(e) => e.stopPropagation()} // Prevent modal from closing when clicking inside
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
        <h3 className="text-xl font-semibold text-gray-900">
          📸 Editează Avatar
        </h3>
        <button
          onClick={closeAvatarModal}
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {!imagePreview ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-600">Selectează o imagine pentru avatar</p>
              <p className="text-sm text-gray-400">PNG, JPG până la 5MB</p>
            </div>
            
            <label className="block">
              <span className="sr-only">Alege fișier</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primaryColor file:text-white
                  hover:file:bg-primaryColor/90
                  file:cursor-pointer cursor-pointer"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Cropper */}
            <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
              <Cropper
                image={imagePreview}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            
            {/* Zoom control */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Zoom: {Math.round(zoom * 100)}%
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Reset button */}
            <button
              onClick={() => {
                setSelectedFile(null);
                setImagePreview(null);
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setUploadError(null);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Selectează altă imagine
            </button>
          </div>
        )}

        {/* Error message */}
        {uploadError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm flex items-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {uploadError}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end space-x-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
        <Button
          onClick={closeAvatarModal}
          className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Anulează
        </Button>
        <Button
          onClick={handleAvatarSave}
          disabled={isUploading || !selectedFile || !croppedAreaPixels}
          className="px-6 py-2 bg-primaryColor text-white rounded-lg hover:bg-primaryColor/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
        >
          {isUploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Salvez...
            </>
          ) : (
            'Salvează Avatar'
          )}
        </Button>
      </div>
    </div>
  );

  // 🔧 LOADING STATES - Folosesc skeleton-uri în loc de text simplu
  if (status === "loading") {
    return <ProfilePageSkeleton activeTab={activeTab} />;
  }
  
  if (!session?.user) return null;

  // 🔧 Provider loading state
  if (loadingProvider) {
    return (
      <ProfilePageSkeleton 
        activeTab={activeTab} 
        showProvider={true} 
        showAdmin={session.user.role === "ADMIN"} 
      />
    );
  }

  const { name, email: sessionEmail } = session.user;
  const isProviderMode = Boolean(provider);
  const avatarSrc = provider?.user.image || defaultAvatar;

  return (
    <div className="flex flex-col space-y-10 p-6">
      {/* Profile card */}
      <div className="max-w-md mx-auto bg-white shadow rounded p-6 text-center">
        <div className="relative w-24 h-24 mx-auto">
          <Image
            src={avatarSrc}
            alt="avatar"
            fill
            className="rounded-full object-cover"
          />
        </div>
        <div className="mt-4">
          {isProviderMode ? (
            isEditingName ? (
              <div className="flex flex-col items-center space-y-2">
                <input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="border px-3 py-1 w-full text-center rounded"
                />
                {nameError && (
                  <p className="text-red-500 text-sm">{nameError}</p>
                )}
                <div className="flex space-x-2">
                  <Button
                    onClick={() => {
                      setIsEditingName(false);
                      setNameError(null);
                    }}
                    className="px-4 py-2 bg-gray-300 rounded"
                  >
                    Anulează
                  </Button>
                  <Button
                    onClick={handleSaveName}
                    disabled={isSavingName}
                    className="px-4 py-2 bg-primaryColor text-white rounded"
                  >
                    {isSavingName ? "Salvez..." : "Salvează"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-bold">{provider.user.name}</h2>
                <Button
                  onClick={handleEditNameClick}
                  className="mt-2 px-3 py-1 bg-gray-200 rounded text-sm"
                >
                  Editează nume
                </Button>
              </div>
            )
          ) : (
            <h2 className="text-xl font-bold">{name}</h2>
          )}
        </div>
        <p className="text-gray-600">
          {isProviderMode ? provider.user.email : sessionEmail}
        </p>
        <div className="flex justify-center space-x-4 mt-4">
          {isProviderMode && (
            <Button
              onClick={() => setShowAvatarModal(true)}
              className="bg-primaryColor text-white px-4 py-2 rounded"
            >
              Editează Avatar
            </Button>
          )}
          <Button
            onClick={() => handleLogout(slug)}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Deconectare
          </Button>
        </div>
      </div>

      {/* Modal Avatar using ModalPortal */}
      <ModalPortal 
        isOpen={showAvatarModal} 
        onClose={closeAvatarModal}
      >
        <AvatarModal />
      </ModalPortal>

      {/* Tabs */}
      <div className="w-full lg:max-w-4xl mx-auto">
        <nav className="mb-8">
          <div className="flex justify-center">
            <div className="grid grid-cols-2 lg:inline-flex bg-gray-50 rounded-2xl p-2 shadow-inner">
              <button
                onClick={() => handleTabChange("packages")}
                className={`
                  px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                  flex items-center gap-2.5 min-w-[130px] justify-center relative overflow-hidden
                  ${activeTab === "packages"
                    ? "bg-white text-primaryColor shadow-lg shadow-primaryColor/20 transform translate-y-[-2px]"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                  }
                `}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300
                  ${activeTab === "packages" 
                    ? "bg-primaryColor/10 text-primaryColor" 
                    : "bg-gray-200 text-gray-400"
                  }
                `}>
                  📦
                </div>
                <span>Pachete</span>
                {activeTab === "packages" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primaryColor to-primaryColor/60 rounded-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange("sessions")}
                className={`
                  px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                  flex items-center gap-2.5 min-w-[130px] justify-center relative overflow-hidden
                  ${activeTab === "sessions"
                    ? "bg-white text-primaryColor shadow-lg shadow-primaryColor/20 transform translate-y-[-2px]"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                  }
                `}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300
                  ${activeTab === "sessions" 
                    ? "bg-primaryColor/10 text-primaryColor" 
                    : "bg-gray-200 text-gray-400"
                  }
                `}>
                  🎯
                </div>
                <span>Ședințe</span>
                {activeTab === "sessions" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primaryColor to-primaryColor/60 rounded-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange("conversatii")}
                className={`
                  px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                  flex items-center gap-2.5 min-w-[130px] justify-center relative overflow-hidden
                  ${activeTab === "conversatii"
                    ? "bg-white text-primaryColor shadow-lg shadow-primaryColor/20 transform translate-y-[-2px]"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                  }
                `}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300
                  ${activeTab === "conversatii" 
                    ? "bg-primaryColor/10 text-primaryColor" 
                    : "bg-gray-200 text-gray-400"
                  }
                `}>
                  💬
                </div>
                <span>Conversații</span>
                {activeTab === "conversatii" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primaryColor to-primaryColor/60 rounded-full"></div>
                )}
              </button>

              <button
                onClick={() => handleTabChange("billing")}
                className={`
                  px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300
                  flex items-center gap-2.5 min-w-[130px] justify-center relative overflow-hidden
                  ${activeTab === "billing"
                    ? "bg-white text-primaryColor shadow-lg shadow-primaryColor/20 transform translate-y-[-2px]"
                    : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
                  }
                `}
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300
                  ${activeTab === "billing" 
                    ? "bg-primaryColor/10 text-primaryColor" 
                    : "bg-gray-200 text-gray-400"
                  }
                `}>
                  🧾
                </div>
                <span>Date Facturare</span>
                {activeTab === "billing" && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primaryColor to-primaryColor/60 rounded-full"></div>
                )}
              </button>
            </div>
          </div>
        </nav>

        <div className="mt-6">
          {activeTab === "packages" && (
            <UserBoughtPackages isProvider={isProviderMode} />
          )}
          {activeTab === "sessions" && <UserSessions />}
          {activeTab === "conversatii" && <UserConversations />}
          {activeTab === "billing" && <UserBillingDetails />}
        </div>
      </div>

      {/* Provider Details */}
      {provider && !loadingProvider && <ProviderDetails provider={provider} />}

      {/* Admin */}
      {session.user.role === "ADMIN" && (
        <div className="max-w-3xl mx-auto mt-10">
          <h3 className="text-lg font-semibold mb-4">
            Administrare Utilizatori
          </h3>
          <AdminPsychics physics={users} />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;