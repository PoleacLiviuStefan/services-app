'use client';

import { signOut, useSession } from 'next-auth/react';
import Image from 'next/image';
import React from 'react';

const ProfilePage = () => {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-semibold text-gray-600">Se încarcă...</p>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-semibold text-red-500">Nu ești autentificat.</p>
      </div>
    );
  }

  const { name, email, image } = session.user;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 py-10">
      <div className="bg-white shadow-lg rounded-lg p-6 w-96 text-center">
        {/* Imaginea utilizatorului */}
        <div className="mb-4">
          <Image
            src={image || '/default-avatar.png'}
            alt="Profile"
            className="w-24 h-24 rounded-full mx-auto border-4 border-primaryColor shadow-md"
          />
        </div>

        {/* Informații utilizator */}
        <h2 className="text-2xl font-bold text-gray-800">{name || 'Nume necunoscut'}</h2>
        <p className="text-gray-500">{email}</p>

        <div className="mt-4">
          {/* <p className="text-lg font-semibold text-gray-700">
            Rol: <span className="font-normal">{role || 'Nespecificat'}</span>
          </p>
          <p className="text-lg font-semibold text-gray-700">
            Gen: <span className="font-normal">{gender || 'Nespecificat'}</span>
          </p> */}
        </div>

        {/* Buton de deconectare */}
        <button
          onClick={() => signOut()}
          className="mt-6 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
        >
          Deconectare
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
