"use client";

import React, { useState, useMemo, useEffect } from 'react';
import ProviderCard from './providerCard';
import EntityRequestApproval from '@/components/EntityRequestApproval';
import { FaCaretLeft, FaCaretRight, FaTrash, FaEye, FaUserTimes } from 'react-icons/fa';
import { ProviderInterface } from '@/interfaces/ProviderInterface';
import { useCatalogStore } from '@/store/catalog';
import { useTranslation } from '@/hooks/useTranslation';

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

interface DeleteUserModal {
  isOpen: boolean;
  user: any | null;
  userInfo: any | null;
  loading: boolean;
}

interface DeleteCatalogModal {
  isOpen: boolean;
  item: any | null;
  type: 'specialities' | 'tools' | 'readings' | null;
  itemInfo: any | null;
  loading: boolean;
}

const AdminPsychics: React.FC<AdminPsychicsProps> = ({ physics }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'users' | 'requests' | 'catalog'>('users');
  const [statusTab, setStatusTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [typeTab, setTypeTab] = useState<'SPECIALITY' | 'TOOL' | 'READING'>('SPECIALITY');
  const [catalogTab, setCatalogTab] = useState<'specialities' | 'tools' | 'readings'>('specialities');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  
  // State pentru ștergerea utilizatorilor
  const [deleteUserModal, setDeleteUserModal] = useState<DeleteUserModal>({
    isOpen: false,
    user: null,
    userInfo: null,
    loading: false
  });

  // State pentru ștergerea din catalog
  const [deleteCatalogModal, setDeleteCatalogModal] = useState<DeleteCatalogModal>({
    isOpen: false,
    item: null,
    type: null,
    itemInfo: null,
    loading: false
  });

  const itemsPerPage = 12;

  // Zustand store pentru catalog
  const { specialities, tools, readings, fetchCatalog } = useCatalogStore();

  // Încarcă catalog-ul la mount
  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

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
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [physics, searchTerm]
  );

  // Filtrează catalog-ul
  const filteredCatalogItems = useMemo(() => {
    const items = catalogTab === 'specialities' ? specialities :
                  catalogTab === 'tools' ? tools : readings;
    
    return items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [catalogTab, specialities, tools, readings, searchTerm]);

  const totalPages = Math.ceil(
    (tab === 'catalog' ? filteredCatalogItems.length : filteredUsers.length) / itemsPerPage
  );

  useEffect(() => {
    if (currentIndex >= totalPages) setCurrentIndex(0);
  }, [totalPages]);

  const startIndex = currentIndex * itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  const currentCatalogItems = filteredCatalogItems.slice(startIndex, startIndex + itemsPerPage);
  console.log("currentUsers: ",currentUsers);
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

  // Funcții pentru ștergerea utilizatorilor
  const openDeleteUserModal = async (user: any) => {
    setDeleteUserModal({ isOpen: true, user, userInfo: null, loading: true });
    
    try {
      const response = await fetch(`/api/admin/users/${user.id}`);
      if (response.ok) {
        const userInfo = await response.json();
        setDeleteUserModal(prev => ({ ...prev, userInfo, loading: false }));
      } else {
        console.error('Eroare la încărcarea informațiilor utilizatorului');
        setDeleteUserModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Eroare la încărcarea informațiilor utilizatorului:', error);
      setDeleteUserModal(prev => ({ ...prev, loading: false }));
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserModal.user) return;
    
    setDeleteUserModal(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await fetch(`/api/admin/users/${deleteUserModal.user.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`Utilizatorul ${result.deletionStats.userName} a fost șters cu succes!`);
        setDeleteUserModal({ isOpen: false, user: null, userInfo: null, loading: false });
        // Reîncarcă lista de utilizatori
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Eroare: ${error.message || error.error}`);
        setDeleteUserModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Eroare la ștergerea utilizatorului:', error);
      alert('Eroare la ștergerea utilizatorului');
      setDeleteUserModal(prev => ({ ...prev, loading: false }));
    }
  };

  // Funcții pentru ștergerea din catalog (cu forța)
  const openDeleteCatalogModal = async (item: any, type: 'specialities' | 'tools' | 'readings') => {
    setDeleteCatalogModal({ isOpen: true, item, type, itemInfo: null, loading: true });
    
    try {
      const response = await fetch(`/api/admin/catalog/${type}/${item.id}`);
      if (response.ok) {
        const itemInfo = await response.json();
        setDeleteCatalogModal(prev => ({ ...prev, itemInfo, loading: false }));
        console.log("itemInfo este: ",itemInfo)
      } else {
        console.error('Eroare la încărcarea informațiilor elementului');
        setDeleteCatalogModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Eroare la încărcarea informațiilor elementului:', error);
      setDeleteCatalogModal(prev => ({ ...prev, loading: false }));
    }
  };

  const confirmDeleteCatalogItem = async () => {
    if (!deleteCatalogModal.item || !deleteCatalogModal.type) return;
    
    setDeleteCatalogModal(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await fetch(`/api/admin/catalog/${deleteCatalogModal.type}/${deleteCatalogModal.item.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`${result.deletedItem.name} a fost șters cu succes! ${result.deletedItem.relationsDeleted ? `S-au șters ${result.deletedItem.relationsDeleted} relații.` : ''}`);
        setDeleteCatalogModal({ isOpen: false, item: null, type: null, itemInfo: null, loading: false });
        // Reîncarcă catalog-ul
        fetchCatalog();
      } else {
        const error = await response.json();
        alert(`Eroare: ${error.message || error.error}`);
        setDeleteCatalogModal(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Eroare la ștergerea din catalog:', error);
      alert('Eroare la ștergerea din catalog');
      setDeleteCatalogModal(prev => ({ ...prev, loading: false }));
    }
  };

  const statusRequests = requests.filter(r => r.status === statusTab);
  const typeRequests = statusRequests.filter(r => r.type === typeTab);

  return (
    <div>
      {/* Tabs principale */}
      <div className="flex space-x-4 mb-4">
        <button
          className={`bg-primaryColor text-white px-4 py-2 rounded hover:bg-secondaryColor transition-colors ${tab === 'users' ? 'font-bold bg-secondaryColor' : ''}`}
          onClick={() => setTab('users')}
        >
          👥 {t('adminPsychics.users')} ({physics.length})
        </button>
        <button
          className={`bg-primaryColor text-white px-4 py-2 rounded hover:bg-secondaryColor transition-colors ${tab === 'requests' ? 'font-bold bg-secondaryColor' : ''}`}
          onClick={() => setTab('requests')}
        >
          📋 {t('adminPsychics.requests')} ({requests.length})
        </button>
        <button
          className={`bg-primaryColor text-white px-4 py-2 rounded hover:bg-secondaryColor transition-colors ${tab === 'catalog' ? 'font-bold bg-secondaryColor' : ''}`}
          onClick={() => setTab('catalog')}
        >
          📚 {t('adminPsychics.catalog')} ({specialities.length + tools.length + readings.length})
        </button>
      </div>

      {/* Tab Utilizatori */}
      {tab === 'users' && (
        <>
          <div className="flex justify-center mb-4">
            <input
              type="text"
              placeholder={t('adminPsychics.searchUser')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-1/2 p-2 border rounded"
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 place-items-center">
            {currentUsers.map(physic => (
              <div key={physic.id} className="relative">
                <ProviderCard
                  forAdmin
                  name={physic.name}
                  image={physic.image}
                  role={physic.role}
                  email={physic.email}
                  isProvider={Boolean(physic.provider)}
                  online={physic.provider?.online}
                  rating={physic.provider?.rating || 0}
                  description={physic.provider?.description || "—"}
                  reviews={physic.provider?.reviewsCount || 0}
                  speciality="Speciality"
                  openDeleteUserModal={()=>openDeleteUserModal(physic)}
                  grossVolume={physic.provider?.grossVolume || 0}
                />
                {/* Butoane de acțiune */}
    
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tab Cereri */}
      {tab === 'requests' && (
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

      {/* Tab Catalog */}
      {tab === 'catalog' && (
        <>
          {/* Sub-tabs pentru catalog */}
          <div className="flex space-x-4 mb-4">
            <button
              className={`px-4 py-2 rounded border ${catalogTab === 'specialities' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setCatalogTab('specialities')}
            >
              🎯 Specialități ({specialities.length})
            </button>
            <button
              className={`px-4 py-2 rounded border ${catalogTab === 'tools' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setCatalogTab('tools')}
            >
              🛠️ Instrumente ({tools.length})
            </button>
            <button
              className={`px-4 py-2 rounded border ${catalogTab === 'readings' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
              onClick={() => setCatalogTab('readings')}
            >
              📖 Reading-uri ({readings.length})
            </button>
          </div>

          {/* Căutare în catalog */}
          <div className="flex justify-center mb-4">
            <input
              type="text"
              placeholder={t('adminPsychics.searchCatalog')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-1/2 p-2 border rounded"
            />
          </div>

          {/* Lista de elemente din catalog */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentCatalogItems.map(item => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow border relative">
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() => openDeleteCatalogModal(item, catalogTab)}
                    className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    title={`Șterge ${catalogTab.slice(0, -1)} (cu forța)`}
                  >
                    <FaTrash className="w-3 h-3" />
                  </button>
                </div>
                <h3 className="font-bold text-lg mb-2 pr-8">{item.name}</h3>
                <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                {catalogTab === 'specialities' && item.price && (
                  <p className="text-green-600 font-semibold">{item.price} Lei</p>
                )}
                {(catalogTab === 'tools' || catalogTab === 'readings') && item.provider && (
                  <p className="text-blue-600 text-sm">Provider: {item.provider.user?.name || 'Necunoscut'}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Paginație */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-4 mt-6">
          <button onClick={goToPrevious} className="p-2 bg-gray-200 rounded hover:bg-gray-300">
            <FaCaretLeft />
          </button>
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              className={`px-3 py-1 rounded ${i === currentIndex ? 'bg-primaryColor text-white' : 'bg-gray-300 hover:bg-gray-400'}`}
              onClick={() => setCurrentIndex(i)}
            >{i + 1}</button>
          ))}
          <button onClick={goToNext} className="p-2 bg-gray-200 rounded hover:bg-gray-300">
            <FaCaretRight />
          </button>
        </div>
      )}

      {/* Modal pentru ștergerea utilizatorilor */}
      {deleteUserModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-red-600">
              ⚠️ {t('adminPsychics.deleteUser')}
            </h3>
            
            {deleteUserModal.loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryColor mx-auto"></div>
                <p className="mt-4 text-gray-600">Se încarcă informațiile...</p>
              </div>
            ) : deleteUserModal.userInfo ? (
              <div>
                <p className="mb-4">
                  {t('adminPsychics.confirmDeleteUser')} <strong>{deleteUserModal.userInfo.user.name || deleteUserModal.userInfo.user.email}</strong>?
                </p>
                
                <div className="bg-gray-100 p-3 rounded mb-4">
                  <h4 className="font-semibold mb-2">Statistici:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Email: {deleteUserModal.userInfo.user.email}</li>
                    <li>• Rol: {deleteUserModal.userInfo.user.role}</li>
                    <li>• Sesiuni ca client: {deleteUserModal.userInfo.stats.sessionsAsClient}</li>
                    <li>• Pachete cumpărate: {deleteUserModal.userInfo.stats.userPackagesPurchased}</li>
                    <li>• Sesiuni active: {deleteUserModal.userInfo.stats.activeSessions}</li>
                    {deleteUserModal.userInfo.user.isProvider && deleteUserModal.userInfo.stats.provider && (
                      <>
                        <li>• Sesiuni ca provider: {deleteUserModal.userInfo.stats.provider.sessionsAsProvider}</li>
                        <li>• Pachete oferite: {deleteUserModal.userInfo.stats.provider.packagesOffered}</li>
                      </>
                    )}
                  </ul>
                </div>

                {deleteUserModal.userInfo.warnings.length > 0 && (
                  <div className="bg-red-100 p-3 rounded mb-4">
                    <h4 className="font-semibold text-red-800 mb-2">⚠️ Atenție:</h4>
                    <ul className="text-red-700 text-sm">
                      {deleteUserModal.userInfo.warnings.map((warning: string, index: number) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-red-600 text-sm mb-4">
                  <strong>{t('adminPsychics.thisActionCannotBeUndone')}</strong> {t('adminPsychics.allAssociatedData')}
                </p>
              </div>
            ) : (
              <p className="text-red-600 mb-4">Eroare la încărcarea informațiilor utilizatorului.</p>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteUserModal({ isOpen: false, user: null, userInfo: null, loading: false })}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                disabled={deleteUserModal.loading}
              >
                {t('adminPsychics.cancel')}
              </button>
              {deleteUserModal.userInfo?.canDelete && (
                <button
                  onClick={confirmDeleteUser}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  disabled={deleteUserModal.loading}
                >
                  {deleteUserModal.loading ? t('adminPsychics.deleting') : t('adminPsychics.deleteDefinitely')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Modal pentru ștergerea din catalog (cu ștergerea forțată) */}
      {deleteCatalogModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-red-600">
              ⚠️ {t('adminPsychics.forceDelete')}
            </h3>
            
            {deleteCatalogModal.loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primaryColor mx-auto"></div>
                <p className="mt-4 text-gray-600">Se încarcă informațiile...</p>
              </div>
            ) : deleteCatalogModal.itemInfo ? (
              <div>
                <p className="mb-4">
                  {t('adminPsychics.confirmDeleteCatalog')} <strong>{deleteCatalogModal.itemInfo.item.name}</strong>?
                </p>
                
                <div className="bg-gray-100 p-3 rounded mb-4">
                  <h4 className="font-semibold mb-2">Detalii:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• Nume: {deleteCatalogModal.itemInfo.item.name}</li>
                    <li>• Descriere: {deleteCatalogModal.itemInfo.item.description}</li>
                    <li>• Provideri afectați: {deleteCatalogModal.itemInfo.relations.providersCount}</li>
                    {deleteCatalogModal.itemInfo.relations.sessionsCount !== undefined && (
                      <li>• Sesiuni care vor rămâne: {deleteCatalogModal.itemInfo.relations.sessionsCount}</li>
                    )}
                    {/* {deleteCatalogModal.itemInfo.relations.mainForCount !== undefined && (
                      <li>• Provideri principali afectați: {deleteCatalogModal.itemInfo.relations.mainForCount}</li>
                    )} */}
                  </ul>
                </div>

                {deleteCatalogModal.itemInfo.relations.providersCount > 0 && (
                  <div className="bg-orange-100 p-3 rounded mb-4">
                    <h4 className="font-semibold text-orange-800 mb-2">🔄 Ce se va întâmpla:</h4>
                    <ul className="text-orange-700 text-sm space-y-1">
                      {deleteCatalogModal.itemInfo.willDisconnectRelations && (
                        <li>• Se vor șterge {deleteCatalogModal.itemInfo.willDisconnectRelations} relații cu providerii</li>
                      )}
                      {deleteCatalogModal.itemInfo.willUpdateProviders && (
                        <li>• Se vor actualiza {deleteCatalogModal.itemInfo.willUpdateProviders} provideri</li>
                      )}
                      {deleteCatalogModal.itemInfo.sessionsWillBeKept && (
                        <li>• {deleteCatalogModal.itemInfo.sessionsWillBeKept} sesiuni vor fi păstrate pentru istoric</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="bg-red-100 p-3 rounded mb-4">
                  <p className="text-red-700 text-sm">
                    <strong>⚠️ {t('adminPsychics.forceDelete')}!</strong> {t('adminPsychics.thisWillDeleteFromAll')}
                  </p>
                </div>

                <p className="text-red-600 text-sm mb-4">
                  <strong>{t('adminPsychics.irreversibleAction')}</strong>
                </p>
              </div>
            ) : (
              <p className="text-red-600 mb-4">Eroare la încărcarea informațiilor elementului.</p>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteCatalogModal({ isOpen: false, item: null, type: null, itemInfo: null, loading: false })}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                disabled={deleteCatalogModal.loading}
              >
                {t('adminPsychics.cancel')}
              </button>
              {deleteCatalogModal.itemInfo && (
                <button
                  onClick={confirmDeleteCatalogItem}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                  disabled={deleteCatalogModal.loading}
                >
                  {deleteCatalogModal.loading ? 'Se șterge...' : 'Șterge cu Forța'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPsychics;