"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AdminPsychics from '@/components/AdminPsychics';
import handleLogout from '@/lib/api/logout/logout';
import defaultAvatar from '../../../public/default-avatar.webp';
import ProviderDetails from '@/components/ProviderDetails';

interface ProviderProfile {
  online: boolean;
  description: string;
  videoUrl?: string | null;
  grossVolume?: number | null;
  calendlyCalendarUri?: string | null;
  reading?: { id: string; name: string; description?: string };
  specialities: { id: string; name: string }[];
  tools: { id: string; name: string }[];
  mainSpeciality?: { id: string; name: string };
  mainTool?: { id: string; name: string };
  reviewsCount: number;
  averageRating: number;
  providerPackages: {
    id: string;
    service: string;
    totalSessions: number;
    price: number;
    expiresAt: string | null;
  }[];
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

  // profil curent ca provider (dacă e provider)
  const [provider, setProvider] = useState<ProviderProfile | null>(null);

  // listă utilizatori/admin
  const [users, setUsers] = useState<any[]>([]);

  // redirecționare dacă nu e autentificat
  useEffect(() => {
    if (status !== 'loading' && !session?.user) {
      router.push('/autentificare');
    }
  }, [session, status, router]);

  // slug din nume
  const rawName = session?.user?.name ?? '';
  const slug = encodeURIComponent(rawName.trim().split(/\s+/).join('-'));

  // fetch profil provider
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      try {
        const res = await fetch(`/api/user/${slug}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          console.error('Fetch provider error:', await res.text());
          return;
        }
        const { provider } = await res.json();
        setProvider(provider);
        console.log('Provider fetched:', provider);
      } catch (err) {
        console.error('Eroare la fetch provider:', err);
      }
    })();
  }, [session, slug]);

  // fetch utilizatori pentru ADMIN
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/get-users', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Eroare la obținerea utilizatorilor');
      const { users } = await res.json();
      setUsers(users);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [session]);

  if (status === 'loading') {
    return <p className="text-center mt-20">Se încarcă...</p>;
  }
  if (!session?.user) return null;

  const { name, email, image, role } = session.user;

  const isProvider = Boolean(provider);

  return (
    <div className="space-y-10 p-6">
      {/* card profil user */}
      <div className="max-w-md mx-auto bg-white shadow rounded p-6 text-center">
        <Image
          src={provider?.user.image || image || defaultAvatar}
          alt="avatar"
          width={100}
          height={100}
          className="rounded-full mx-auto"
        />
        <h2 className="mt-4 text-xl font-bold">{provider?.user.name || name}</h2>
        <p className="text-gray-600">{provider?.user.email || email}</p>
        <button
          onClick={() => handleLogout(slug)}
          className="mt-4 bg-red-500 text-white px-4 py-2 rounded"
        >
          Deconectare
        </button>
      </div>

      {/* secțiune provider */}
      {isProvider && (
        <ProviderDetails provider={provider}  />
      )}

      {/* secțiune Admin */}
      {role === 'ADMIN' && (
        <div className="max-w-3xl mx-auto mt-10">
          <h3 className="text-lg font-semibold mb-4">Administrare Utilizatori</h3>
          <AdminPsychics physics={users} />
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
