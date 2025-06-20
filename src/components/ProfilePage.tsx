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

const ProfilePage: React.FC = () => {
  const { data: session, status, update: refreshSession } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'packages' | 'sessions'>('packages');

  // Redirect dacă nu e autentificat
  useEffect(() => {
    if (status !== "loading" && !session?.user) {
      router.push("/autentificare");
    }
  }, [session, status, router]);

  // Slug din nume
  const rawName = session?.user?.name ?? "";
  const slug = rawName
    ? encodeURIComponent(rawName.trim().split(/\s+/).join("-"))
    : "";

  // Fetch provider
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
        console.error("Fetch provider error:", await res.text());
        setProvider(null);
      } else {
        const { provider } = await res.json();
        setProvider(provider as ProviderProfile);
      }
    } catch (err) {
      console.error("Eroare la fetch provider:", err);
      setProvider(null);
    } finally {
      setLoadingProvider(false);
    }
  };
  useEffect(() => {
    if (status === "authenticated" && slug) fetchProviderBySlug();
  }, [status, slug]);

  // OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (status === "authenticated" && slug && code && state) {
      const [type, provId] = state.split(":");
      (async () => {
        try {
          const url =
            type === 'stripe'
              ? `/api/provider/${provId}/stripe-connect/callback?code=${code}`
              : `/api/provider/${provId}/calendly-connect/callback?code=${code}`;
          const resp = await fetch(url);
          if (!resp.ok) console.error(`Erroare ${type} callback:`, await resp.text());
          else await fetchProviderBySlug();
        } catch (err) {
          console.error("Eroare la OAuth callback:", err);
        } finally {
          router.replace("/profil", { scroll: false });
        }
      })();
    }
  }, [searchParams, status, slug, router]);

  // Fetch users admin
  useEffect(() => {
    if (session?.user.role === 'ADMIN') {
      (async () => {
        try {
          const res = await fetch("/api/admin/get-users", { credentials: 'include' });
          if (!res.ok) throw new Error("Eroare la obținerea utilizatorilor");
          const { users } = await res.json();
          setUsers(users);
        } catch (err) {
          console.error(err);
        }
      })();
    }
  }, [session]);

  // Handlers crop/avatar
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  const onCropComplete = (_: any, croppedPixels: any) => setCroppedAreaPixels(croppedPixels);
  const handleAvatarSave = async () => {
    if (!selectedFile || !provider || !croppedAreaPixels || !imagePreview) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const blob = await getCroppedImg(imagePreview, croppedAreaPixels, selectedFile.type);
      const croppedFile = new File([blob], selectedFile.name, { type: selectedFile.type });
      const formData = new FormData();
      formData.append('avatar', croppedFile);
      const res = await fetch(`/api/provider/${provider.id}/avatar`, { method: 'PUT', body: formData });
      if (!res.ok) {
        const errJson = await res.json();
        setUploadError(errJson.error || 'A apărut o eroare la upload');
      } else {
        const { imageUrl } = await res.json();
        setProvider(p => p ? { ...p, user: { ...p.user, image: imageUrl } } : p);
        setShowAvatarModal(false);
        setSelectedFile(null);
        setImagePreview(null);
      }
    } catch (err) {
      console.error(err);
      setUploadError('Eroare la procesarea imaginii');
    } finally { setIsUploading(false); }
  };

  // Handlers nume
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
  const handleCancelEditName = () => { setIsEditingName(false); setNameError(null); };

  if (status === 'loading') return <p className="text-center mt-20">Se încarcă...</p>;
  if (!session?.user) return null;

  const { name, email: sessionEmail } = session.user;
  const isProvider = Boolean(provider);
  const avatarSrc = provider?.user.image || defaultAvatar;

  return (
    <div className="flex flex-col space-y-10 p-6">
      {/* Profil card */}
      <div className="max-w-md mx-auto bg-white shadow rounded p-6 text-center">
        <div className="relative w-24 h-24 mx-auto">
          <Image src={avatarSrc} alt="avatar" fill className="rounded-full object-cover" />
        </div>
        <div className="mt-4">
          {isProvider ? (
            isEditingName ? (
              <div className="flex flex-col items-center space-y-2">
                <input type="text" value={editedName} onChange={e => setEditedName(e.target.value)} className="border border-gray-300 rounded px-3 py-1 w-full text-center" />
                {nameError && <p className="text-red-500 text-sm">{nameError}</p>}
                <div className="flex space-x-2">
                  <Button onClick={handleCancelEditName} className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Anulează</Button>
                  <Button onClick={handleSaveName} disabled={isSavingName} className="px-4 py-2 bg-primaryColor text-white rounded hover:bg-secondaryColor disabled:opacity-50">{isSavingName ? 'Salvez...' : 'Salvează'}</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <h2 className="text-xl font-bold">{provider.user.name}</h2>
                <Button onClick={handleEditNameClick} className="mt-2 px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 text-sm">Editează nume</Button>
              </div>
            )
          ) : (
            <h2 className="text-xl font-bold">{name}</h2>
          )}
        </div>
        <p className="text-gray-600">{isProvider ? provider.user.email : sessionEmail}</p>
        <div className="flex justify-center space-x-4 mt-4">
          {isProvider && <Button onClick={() => setShowAvatarModal(true)} className="bg-primaryColor text-white px-4 py-2 rounded hover:bg-secondaryColor">Editează Avatar</Button>}
          <Button onClick={() => handleLogout(slug)} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Deconectare</Button>
        </div>
      </div>

      {/* Modal Avatar */}
      {showAvatarModal && (
        <Modal closeModal={() => setShowAvatarModal(false)} title="Editează Avatar">
          <div className="space-y-4">
            {!imagePreview ? (
              <input type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-700" />
            ) : (
              <>  
                <div className="relative w-full h-60 bg-gray-100">
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
                <input type="range" min={1} max={3} step={0.1} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-full" />
              </>
            )}
            {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}
            <div className="flex justify-end space-x-2">
              <Button onClick={() => { setShowAvatarModal(false); setImagePreview(null); setSelectedFile(null); }} className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400">Anulează</Button>
              <Button onClick={handleAvatarSave} disabled={!selectedFile || !croppedAreaPixels || isUploading} className="px-4 py-2 bg-primaryColor text-white rounded hover:bg-secondaryColor disabled:opacity-50">{isUploading ? 'Se încarcă...' : 'Salvează'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Tabs */}
      <div className="max-w-2xl mx-auto">
        <nav className="flex border-b">
          <button onClick={() => setActiveTab('packages')} className={`px-4 py-2 -mb-px text-sm font-medium ${activeTab==='packages'? 'border-b-2 border-primaryColor text-primaryColor':'text-gray-600'}`}>Pachete</button>
          <button onClick={() => setActiveTab('sessions')} className={`ml-6 px-4 py-2 -mb-px text-sm font-medium ${activeTab==='sessions'? 'border-b-2 border-primaryColor text-primaryColor':'text-gray-600'}`}>Ședințe</button>
        </nav>
        <div className="mt-6">{activeTab==='packages'? <UserBoughtPackages isProvider={isProvider}/> : <UserSessions/>}</div>
      </div>

      {/* Provider Details */}
      {provider && !loadingProvider && <ProviderDetails provider={provider} />}

      {/* Admin */}
      {session.user.role==='ADMIN' && (
        <div className="max-w-3xl mx-auto mt-10">
          <h3 className="text-lg font-semibold mb-4">Administrare Utilizatori</h3>
          <AdminPsychics physics={users} />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
