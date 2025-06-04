// components/ProfilePage.tsx
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
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [users, setUsers] = useState<any[]>([]);

  // Avatar upload state
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 1) Redirect to login if not authenticated
  useEffect(() => {
    if (status !== "loading" && !session?.user) {
      router.push("/autentificare");
    }
  }, [session, status, router]);

  // 2) Build “slug” from session.user.name once available
  const rawName = session?.user?.name ?? "";
  const slug = rawName
    ? encodeURIComponent(rawName.trim().split(/\s+/).join("-"))
    : "";

  // 3) Fetch provider data by “slug”
  const fetchProviderBySlug = async () => {
    if (!slug) {
      setProvider(null);
      setLoadingProvider(false);
      return;
    }
    setLoadingProvider(true);
    try {
      const res = await fetch(`/api/user/${slug}`, {
        credentials: "include",
      });
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

  // 4) Initial fetch once session and slug are ready
  useEffect(() => {
    if (status === "authenticated" && slug) {
      fetchProviderBySlug();
    }
  }, [session, slug, status]);

  // 5) Handle OAuth callback (Stripe or Calendly) – folosim prefix în `state`
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // ex: "stripe:<providerId>" sau "calendly:<providerId>"

    if (status === "authenticated" && slug && code && state) {
      const [type, provId] = state.split(":");
      if (!type || !provId) return;

      (async () => {
        try {
          if (type === "stripe") {
            // apelăm doar endpoint-ul Stripe callback
            const resp = await fetch(
              `/api/provider/${provId}/stripe-connect/callback?code=${code}`,
              { method: "GET" }
            );
            if (!resp.ok) {
              console.error("Eroare la callback Stripe OAuth:", await resp.text());
            } else {
              // re-fetch provider ca să includă stripeAccountId
              await fetchProviderBySlug();
            }
          } else if (type === "calendly") {
            // apelăm doar endpoint-ul Calendly callback
            const resp = await fetch(
              `/api/provider/${provId}/calendly-connect/callback?code=${code}`,
              { method: "GET" }
            );
            if (!resp.ok) {
              console.error("Eroare la callback Calendly OAuth:", await resp.text());
            } else {
              // re-fetch provider ca să includă calendlyCalendarUri
              await fetchProviderBySlug();
            }
          }
        } catch (err) {
          console.error("Eroare la apelul callback OAuth:", err);
        } finally {
          // eliminăm parametrii ?code și ?state din URL
          router.replace("/profil", { scroll: false });
        }
      })();
    }
  }, [searchParams, status, slug, router]);

  // 6) If user is ADMIN, fetch users list
  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/get-users", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Eroare la obținerea utilizatorilor");
      const { users } = await res.json();
      setUsers(users);
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  };
  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchUsers();
    }
  }, [session]);

  // 7) Avatar handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAvatarSave = async () => {
    if (!selectedFile || !provider) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", selectedFile);

      const res = await fetch(`/api/provider/${provider.id}/avatar`, {
        method: "PUT",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json();
        setUploadError(errJson.error || "A apărut o eroare");
      } else {
        const { imageUrl } = await res.json();
        setProvider((prev) =>
          prev
            ? {
                ...prev,
                user: { ...prev.user, image: imageUrl },
              }
            : prev
        );
        setShowAvatarModal(false);
        setSelectedFile(null);
      }
    } catch (err: any) {
      console.error("Error uploading avatar:", err);
      setUploadError("A apărut o eroare la încărcare");
    } finally {
      setIsUploading(false);
    }
  };

  if (status === "loading") {
    return <p className="text-center mt-20">Se încarcă...</p>;
  }
  if (!session?.user) return null;

  const { name, email, image, role } = session.user;
  const isProvider = Boolean(provider);
  const avatarSrc = provider?.user.image
  ? `${process.env.NEXT_PUBLIC_FILE_ROUTE}/${provider.user.image}` 
  : defaultAvatar;

  return (
    <div className="flex flex-col space-y-10 p-6">
      {/* User Profile Card */}
      <div className="max-w-md mx-auto bg-white shadow rounded p-6 text-center">
        <div className="relative w-24 h-24 mx-auto">
          <Image
            src={avatarSrc}
            alt="avatar"
            fill
            className="rounded-full object-cover"
          />
        </div>
        <h2 className="mt-4 text-xl font-bold">
          {provider?.user.name || name}
        </h2>
        <p className="text-gray-600">{provider?.user.email || email}</p>

        <div className="flex justify-center space-x-4 mt-4">
          {isProvider && (
            <Button
              onClick={() => {
                setUploadError(null);
                setSelectedFile(null);
                setShowAvatarModal(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Editează Avatar
            </Button>
          )}
          <Button
            onClick={() => handleLogout(slug)}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Deconectare
          </Button>
        </div>
      </div>

      {/* Avatar Modal */}
      {showAvatarModal && (
        <Modal
          closeModal={() => {
            setShowAvatarModal(false);
            setSelectedFile(null);
            setUploadError(null);
          }}
          title="Editează Avatar"
        >
          <div className="space-y-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-700"
            />
            {uploadError && (
              <p className="text-red-500 text-sm">{uploadError}</p>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => {
                  setShowAvatarModal(false);
                  setSelectedFile(null);
                  setUploadError(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Anulează
              </Button>
              <Button
                onClick={handleAvatarSave}
                disabled={!selectedFile || isUploading}
                className="px-4 py-2 bg-primaryColor text-white rounded hover:bg-secondaryColor disabled:opacity-50"
              >
                {isUploading ? "Se încarcă..." : "Salvează"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Provider Section */}
      {isProvider && provider && !loadingProvider && (
        <ProviderDetails provider={provider} />
      )}

      {/* Admin Section */}
      {role === "ADMIN" && (
        <div className="max-w-3xl mx-auto mt-10">
          <h3 className="text-lg font-semibold mb-4">Administrare Utilizatori</h3>
          <AdminPsychics physics={users} />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
