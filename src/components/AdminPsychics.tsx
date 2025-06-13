"use client";

import React, { useState, useMemo, useEffect } from 'react';
import ProviderCard from './providerCard';
import EntityRequestApproval from '@/components/EntityRequestApproval';
import { FaCaretLeft, FaCaretRight } from 'react-icons/fa';
import { ProviderInterface } from '@/interfaces/ProviderInterface';

interface AdminPsychicsProps {
  physics: (ProviderInterface & { provider: string })[];
}

interface ApprovalRequest {
  id: string;
  type: 'SPECIALITY' | 'TOOL' | 'READING';
  name: string;
  description?: string;
  price?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdByName: string;
  createdAt: string;
}

const AdminPsychics: React.FC<AdminPsychicsProps> = ({ physics }) => {
  const [tab, setTab] = useState<'users' | 'requests'>('users');
  const [statusTab, setStatusTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [typeTab, setTypeTab] = useState<'SPECIALITY' | 'TOOL' | 'READING'>('SPECIALITY');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const itemsPerPage = 12;

  useEffect(() => {
    async function loadRequests() {
      const res = await fetch('/api/requests');
      if (res.ok) {
        const data: ApprovalRequest[] = await res.json();
        setRequests(data);
      }
    }
    if (tab === 'requests') loadRequests();
  }, [tab]);

  const filteredUsers = useMemo(
    () => physics.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [physics, searchTerm]
  );

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  useEffect(() => {
    if (currentIndex >= totalPages) setCurrentIndex(0);
  }, [totalPages]);

  const startIndex = currentIndex * itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const goToPrevious = () => setCurrentIndex(prev => prev > 0 ? prev - 1 : totalPages - 1);
  const goToNext = () => setCurrentIndex(prev => prev < totalPages - 1 ? prev + 1 : 0);

  const handleApprove = async (id: string) => {
    await fetch(`/api/requests/${id}/approve`, { method: 'POST' });
    setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
  };

  const handleReject = async (id: string) => {
    await fetch(`/api/requests/${id}/reject`, { method: 'POST' });
    setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
  };

  const statusRequests = requests.filter(r => r.status === statusTab);
  const typeRequests = statusRequests.filter(r => r.type === typeTab);

  return (
    <div>
      <div className="flex space-x-4 mb-4">
        <button
          className={`bg-primaryColor text-white p-2 hover:bg-secondaryColor ${tab === 'users' ? 'font-bold bg-secondaryColor' : ''}`}
          onClick={() => setTab('users')}
        >
          Utilizatori
        </button>
        <button
          className={`bg-primaryColor text-white p-2 hover:bg-secondaryColor ${tab === 'requests' ? 'font-bold bg-secondaryColor' : ''}`}
          onClick={() => setTab('requests')}
        >
          Cereri
        </button>
      </div>

      {tab === 'users' ? (
        <>
          <div className="flex justify-center mb-4">
            <input
              type="text"
              placeholder="Caută utilizator..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-1/2 p-2 border rounded"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {currentUsers.map(physic => (
              <ProviderCard
                key={physic.id}
                forAdmin
                name={physic.name}
                image={physic.image}
                role={physic.role}
                email={physic.email}
                isProvider={Boolean(physic.provider)}
                online={physic.provider?.online}
                rating={physic.provider?.rating || 0}
                description="Lorem ipsum dolor sit amet"
                reviews={Math.floor(Math.random() * 100)}
                speciality="Speciality"
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-4 mt-6">
              <button onClick={goToPrevious} className="p-2 bg-gray-200 rounded">
                <FaCaretLeft />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  className={`px-2 py-1 rounded ${i === currentIndex ? 'bg-gray-600 text-white' : 'bg-gray-300'}`}
                  onClick={() => setCurrentIndex(i)}
                >{i + 1}</button>
              ))}
              <button onClick={goToNext} className="p-2 bg-gray-200 rounded">
                <FaCaretRight />
              </button>
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="flex space-x-4 mb-4">
            {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
  <button
    key={s}
    className={`text-white px-3 py-1 rounded ` +
      (s === 'PENDING'
        ? 'bg-yellow-500'
        : s === 'APPROVED'
        ? 'bg-green-500'
        : 'bg-red-500') +
      (statusTab === s ? ' font-bold underline' : '')
    }
    onClick={() => setStatusTab(s as 'PENDING' | 'APPROVED' | 'REJECTED')}
  >
    {s.charAt(0) + s.slice(1).toLowerCase()}
  </button>
))}
          </div>
          <div className="flex space-x-4 mb-4">
            {[
              { key: 'SPECIALITY', label: 'Specialități' },
              { key: 'TOOL', label: 'Instrumente' },
              { key: 'READING', label: 'Reading-uri' }
            ].map(tabInfo => (
              <button
                key={tabInfo.key}
                className={typeTab === tabInfo.key ? 'font-bold underline' : ''}
                onClick={() => setTypeTab(tabInfo.key as 'SPECIALITY' | 'TOOL' | 'READING')}
              >{tabInfo.label}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {typeRequests.length > 0 ? (
              typeRequests.map(req => (
                <EntityRequestApproval
                  key={req.id}
                  title={req.name}
                  description={req.description}
                  price={typeTab === 'SPECIALITY' ? undefined : req.price}
                  status={req.status}
                  createdByName={req.createdByName}
                  createdAt={req.createdAt}
                  onApprove={() => handleApprove(req.id)}
                  onReject={() => handleReject(req.id)}
                />
              ))
            ) : (
              <p className="text-gray-500">Nici o cerere în această categorie și stare.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPsychics;
