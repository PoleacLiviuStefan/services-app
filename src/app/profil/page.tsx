'use client';

import AdminPsychics from '@/components/AdminPsychics';
import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation'; // ✅ Import corect
import { useEffect, useState } from 'react';

const ProfilePage = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]); // State pentru utilizatori
  useEffect(() => {
    if (status !== 'loading' && !session?.user) {
      router.push("/autentificare");
    }
  }, [session, status, router]);

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/get-users", {
      method: "GET",
      credentials: "include",
    });
  
    if (!res.ok) {
      throw new Error("Eroare la obținerea utilizatorilor");
    }
    
    const data = await res.json();
    console.log("res este ", data);
    return data.users;
  };
  
  useEffect(() => {
    fetchUsers()
      .then(data => setUsers(data))
      .catch(error => console.error("Error:", error));
  }, []);
  

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-semibold text-gray-600">Se încarcă...</p>
      </div>
    );
  }

  if (!session?.user) {
    return null; // Previne randarea înainte de redirecționare
  }

  const { name, email, image, role } = session.user;
  console.log("role este ", role);
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 py-10">
      <div className="bg-white shadow-lg rounded-lg p-6 w-96 text-center">
        {/* Imaginea utilizatorului */}
        <div className="mb-4">
          {image ? (
            <Image
              src={image}
              alt="Profile"
              width={96} // ✅ Next.js necesită width și height la <Image />
              height={96}
              className="w-24 h-24 rounded-full mx-auto border-4 border-primaryColor shadow-md"
            />
          ) : null}
        </div>

        {/* Informații utilizator */}
        <h2 className="text-2xl font-bold text-gray-800">{name || 'Nume necunoscut'}</h2>
        <p className="text-gray-500">{email}</p>

        <div className="mt-4">
          <p className="text-lg font-semibold text-gray-700">
            Rol: <span className="font-normal">{role || 'Nespecificat'}</span>
          </p>
        </div>

        {/* Buton de deconectare */}
        <button
          onClick={() => signOut()}
          className="mt-6 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
        >
          Deconectare
        </button>
      </div>
      {role === 'ADMIN' && (
        <AdminPsychics physics={users}  />
      )}
    </div>
  );
};

export default ProfilePage;
