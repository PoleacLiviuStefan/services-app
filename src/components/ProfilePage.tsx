// File: components/ProfilePage.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import AdminPsychics from "@/components/AdminPsychics";
import handleLogout from "@/lib/api/logout/logout";
import defaultAvatar from "../../public/default-avatar.webp";
import ProviderDetails from "@/components/ProviderDetails";
import Modal from "@/components/ui/modal";
import Button from "@/components/atoms/button";
import UserBoughtPackages from "./UserBoughtPackages";
import UserSessions from "./UserSessions";
import UserBillingDetails from "./UserBillingDetails";
import UserConversations from "./UserConversations";
import Cropper from "react-easy-crop";
import { getCroppedImg } from "@/utils/cropImage";

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
  specialities: { id: string; name: string; description?: string; price?: number }[];
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

// Actualizez tipul Tab pentru a include 'conversatii'
type Tab = 'packages' | 'sessions' | 'billing' | 'conversatii';

const ProfilePage: React.FC = () => {
  const { data: session, status, update: refreshSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Determine initial tab from ?tab= query
  const paramTab = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(paramTab ?? 'packages');

  // Sync tab if URL changes
  useEffect(() => {
    const t = searchParams.get('tab') as Tab;
    if (t === 'packages' || t === 'sessions' || t === 'billing' || t === 'conversatii') {
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
    if (status !== 'loading' && !session?.user) {
      router.push('/autentificare');
    }
  }, [session, status, router]);

  // Build slug for fetching provider
  const rawName = session?.user?.name ?? '';
  const slug = rawName ? encodeURIComponent(rawName.trim().split(/\s+/).join('-')) : '';

  const fetchProviderBySlug = async () => {
    if (!slug) {
      setProvider(null);
      setLoadingProvider(false);
      return;
    }
    setLoadingProvider(true);
    try {
      const res = await fetch(`/api/user/${slug}`, { credentials: 'include' });
      if (!res.ok) {
        setProvider(null);
      } else {
        const { provider } = await res.json();
        setProvider(provider as ProviderProfile);
      }
    } catch (err) {
      console.error(err);
      setProvider(null);
    } finally {
      setLoadingProvider(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && slug) fetchProviderBySlug();
  }, [status, slug]);

  // Handle OAuth callback for Stripe/Calendly
  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    if (status === 'authenticated' && slug && code && state) {
      const [type, provId] = state.split(':');
      (async () => {
        const url = type === 'stripe'
          ? `/api/provider/${provId}/stripe-connect/callback?code=${code}`
          : `/api/provider/${provId}/calendly-connect/callback?code=${code}`;
        const resp = await fetch(url);
        if (!resp.ok) console.error(await resp.text());
        else await fetchProviderBySlug();
        router.replace('/profil', { scroll: false });
      })();
    }
  }, [searchParams, status, slug, router]);

  // Admin: fetch all users
  useEffect(() => {
    if (session?.user.role === 'ADMIN') {
      fetch('/api/admin/get-users', { credentials: 'include' })
        .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
        .then(data => setUsers(data.users))
        .catch(console.error);
    }
  }, [session]);

  // Avatar crop handlers
  const onCropComplete = (_: any, pixels: any) => setCroppedAreaPixels(pixels);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  const handleAvatarSave = async () => {
    if (!selectedFile || !provider || !croppedAreaPixels || !imagePreview) return;
    setIsUploading(true);
    try {
      const blob = await getCroppedImg(imagePreview, croppedAreaPixels, selectedFile.type);
      const file = new File([blob], selectedFile.name, { type: selectedFile.type });
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`/api/provider/${provider.id}/avatar`, { method: 'PUT', body: formData });
      if (!res.ok) throw new Error();
      const { imageUrl } = await res.json();
      setProvider(p => p && { ...p, user: { ...p.user, image: imageUrl } });
      setShowAvatarModal(false);
    } catch {
      setUploadError('Eroare la upload');
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
    if (!editedName.trim() || !provider) return setNameError('Numele nu poate fi gol.');
    setIsSavingName(true);
    try {
      const res = await fetch(`/api/provider/${provider.id}/update-name`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editedName.trim() })
      });
      if (!res.ok) {
        const err = await res.json();
        setNameError(err.error || 'Eroare la salvare');
      } else {
        await fetchProviderBySlug();
        await refreshSession();
        setIsEditingName(false);
      }
    } catch { setNameError('Eroare de rețea'); }
    finally { setIsSavingName(false); }
  };

  // Funcție pentru a actualiza URL-ul cu tab-ul selectat
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.replace(url.pathname + url.search, { scroll: false });
  };

  if (status === 'loading') return <p className="text-center mt-20">Se încarcă...</p>;
  if (!session?.user) return null;

  const { name, email: sessionEmail } = session.user;
  const isProviderMode = Boolean(provider);
  const avatarSrc = provider?.user.image || defaultAvatar;

  return (
    <div className="flex flex-col space-y-10 p-6">
      {/* Profil card */}
      <div className="max-w-md mx-auto bg-white shadow rounded p-6 text-center">
        <div className="relative w-24 h-24 mx-auto">
          <Image src={avatarSrc} alt="avatar" fill className="rounded-full object-cover" />
        </div>
        <div className="mt-4">
          {isProviderMode ? (
            isEditingName ? (
              <div className="flex flex-col items-center space-y-2">
                <input value={editedName} onChange={e => setEditedName(e.target.value)} className="border px-3 py-1 w-full text-center rounded" />
                {nameError && <p className="text-red-500 text-sm">{nameError}</p>}
                <div className="flex space-x-2">
                  <Button onClick={() => {setIsEditingName(false); setNameError(null);}} className="px-4 py-2 bg-gray-300 rounded">Anulează</Button>
                  <Button onClick={handleSaveName} disabled={isSavingName} className="px-4 py-2 bg-primaryColor text-white rounded">{isSavingName ? 'Salvez...' : 'Salvează'}</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-bold">{provider.user.name}</h2>
                <Button onClick={handleEditNameClick} className="mt-2 px-3 py-1 bg-gray-200 rounded text-sm">Editează nume</Button>
              </div>
            )
          ) : <h2 className="text-xl font-bold">{name}</h2>}
        </div>
        <p className="text-gray-600">{isProviderMode ? provider.user.email : sessionEmail}</p>
        <div className="flex justify-center space-x-4 mt-4">
          {isProviderMode && <Button onClick={() => setShowAvatarModal(true)} className="bg-primaryColor text-white px-4 py-2 rounded">Editează Avatar</Button>}
          <Button onClick={() => handleLogout(slug)} className="bg-red-500 text-white px-4 py-2 rounded">Deconectare</Button>
        </div>
      </div>

      {/* Modal Avatar */}
      {showAvatarModal && (
        <Modal closeModal={() => setShowAvatarModal(false)} title="Editează Avatar">
          <div className="space-y-4">
            {!imagePreview ? (
              <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm" />
            ) : (
              <>  
                <div className="relative w-full h-60 bg-gray-100">
                  <Cropper image={imagePreview} crop={crop} zoom={zoom} aspect={1}
                    onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete} />
                </div>
                <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-full" />
              </>
            )}
            {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setShowAvatarModal(false)} className="px-4 py-2 bg-gray-300 rounded">Anulează</Button>
              <Button onClick={handleAvatarSave} disabled={isUploading} className="px-4 py-2 bg-primaryColor text-white rounded">Salvează</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Tabs */}
      <div className="max-w-4xl mx-auto">
        <nav className="flex border-b overflow-x-auto">
          <button 
            onClick={() => handleTabChange('packages')} 
            className={`px-4 py-2 -mb-px text-sm font-medium whitespace-nowrap ${
              activeTab === 'packages' 
                ? 'border-b-2 border-primaryColor text-primaryColor' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Pachete
          </button>
          <button 
            onClick={() => handleTabChange('sessions')} 
            className={`ml-6 px-4 py-2 -mb-px text-sm font-medium whitespace-nowrap ${
              activeTab === 'sessions' 
                ? 'border-b-2 border-primaryColor text-primaryColor' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Ședințe
          </button>
          <button 
            onClick={() => handleTabChange('conversatii')} 
            className={`ml-6 px-4 py-2 -mb-px text-sm font-medium whitespace-nowrap ${
              activeTab === 'conversatii' 
                ? 'border-b-2 border-primaryColor text-primaryColor' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Conversații
          </button>
          <button 
            onClick={() => handleTabChange('billing')} 
            className={`ml-6 px-4 py-2 -mb-px text-sm font-medium whitespace-nowrap ${
              activeTab === 'billing' 
                ? 'border-b-2 border-primaryColor text-primaryColor' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Date Facturare
          </button>
        </nav>
        
        <div className="mt-6">
          {activeTab === 'packages' && <UserBoughtPackages isProvider={isProviderMode} />}
          {activeTab === 'sessions' && <UserSessions />}
          {activeTab === 'conversatii' && <UserConversations />}
          {activeTab === 'billing' && <UserBillingDetails />}
        </div>
      </div>

      {/* Provider Details */}
      {provider && !loadingProvider && <ProviderDetails provider={provider} />}

      {/* Admin */}
      {session.user.role === 'ADMIN' && (
        <div className="max-w-3xl mx-auto mt-10">
          <h3 className="text-lg font-semibold mb-4">Administrare Utilizatori</h3>
          <AdminPsychics physics={users} />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;