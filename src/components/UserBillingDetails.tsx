// File: components/UserBillingDetails.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from '@/hooks/useTranslation';

interface BillingDetails {
  id: string;
  userId: string;
  companyName: string;
  cif: string;
  address: string;
  phone: string;
  bank: string;
  iban: string;
}

type EntityType = 'persFizica' | 'persJuridica';


const fieldLabels: Record<keyof BillingDetails, string> = {
  companyName: 'userBillingDetails.companyName',
  cif: 'userBillingDetails.cif',
  address: 'userBillingDetails.address',
  phone: 'userBillingDetails.phone',
  bank: 'userBillingDetails.bank',
  iban: 'userBillingDetails.iban',
  id: '',
  userId: ''
};

export default function UserBillingDetails() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [details, setDetails] = useState<BillingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [entityType, setEntityType] = useState<EntityType>('persFizica');
  const [form, setForm] = useState<Partial<BillingDetails>>({});
  const [errors, setErrors] = useState<Partial<Record<keyof BillingDetails, string>>>({});

  // Required fields based on entity type
    // Required fields based on entity type
  const requiredFields: (keyof BillingDetails)[] = entityType === 'persJuridica'
    ? ['companyName','cif','address','phone','bank','iban']
    : ['companyName','address','phone'];

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;
    fetch(`/api/user/billing-details/${userId}`, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error("Fetch error");
        return res.json();
      })
      .then(data => {
        const bd: BillingDetails | null = data.billingDetails ?? null;
        setDetails(bd);
        if (bd) {
          setForm(bd);
          // infer entity type by presence of bank
          setEntityType(bd.bank?.trim() ? 'persJuridica' : 'persFizica');
        }
      })
      .catch(() => setError(t('userBillingDetails.loadError')))
      .finally(() => setLoading(false));
  }, [session]);

  const handleTypeChange = (type: EntityType) => {
    setEntityType(type);
    // clear bank/iban if switching to physical
    if (type === 'persFizica') {
      setForm(prev => ({ ...prev, bank: '', iban: '' }));
    }
    setErrors({});
  };

  const handleChange = (field: keyof BillingDetails, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({
      ...prev,
      [field]: (!value.trim() && requiredFields.includes(field))
        ? 'Acest câmp este obligatoriu.'
        : undefined
    }));
  };

  const isFormValid = requiredFields.every(field => !!form[field]?.toString().trim())
    && requiredFields.every(field => !errors[field]);

  const save = () => {
    if (!isFormValid) {
      const newErrs: typeof errors = {};
      requiredFields.forEach(f => {
        if (!form[f]?.toString().trim()) {
          newErrs[f] = 'Acest câmp este obligatoriu.';
        }
      });
      setErrors(newErrs);
      return;
    }
    const userId = session?.user?.id;
    if (!userId) return;

    // include entityType in payload
    const payload = { entityType, ...form };

    fetch(`/api/user/billing-details/${userId}`, {
      method: details ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
      .then(res => {
        if (!res.ok) throw new Error("Save error");
        return res.json();
      })
      .then(data => {
        setDetails(data.billingDetails);
        setForm(data.billingDetails);
        setEntityType(data.billingDetails.bank?.trim() ? 'persJuridica' : 'persFizica');
        setEditMode(false);
      })
      .catch(() => setError(t('userBillingDetails.saveError')));
  };

  if (loading) return <p>{t('userBillingDetails.loading')}</p>;
  if (error)   return <p className="text-red-500">{error}</p>;

  return (
    <div className="bg-white shadow rounded p-6 lg:max-w-4xl">
      <h3 className="text-lg font-semibold mb-4">{t('userBillingDetails.title')}</h3>

      <div className="mb-4">
        <label className="inline-flex items-center mr-4">
          <input
            type="radio"
            checked={entityType==='persFizica'}
            onChange={() => handleTypeChange('persFizica')}
            className="form-radio"
          />
          <span className="ml-2">{t('userBillingDetails.persFizica')}</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            checked={entityType==='persJuridica'}
            onChange={() => handleTypeChange('persJuridica')}
            className="form-radio"
          />
          <span className="ml-2">{t('userBillingDetails.persJuridica')}</span>
        </label>
      </div>

      {editMode ? (
        <div className="space-y-3">
          {requiredFields.map(field => (
            <div key={field}>
              <label className="block text-sm font-medium">
                {field === 'companyName'
                  ? (entityType === 'persFizica' ? t('userBillingDetails.fullName') : t('userBillingDetails.companyName'))
                  : t(fieldLabels[field]) || field
                }
              </label>
              <input
                type="text"
                value={(form as any)[field] ?? ''}
                onChange={e => handleChange(field, e.target.value)}
                className="w-full border p-2 rounded"
              />
        {errors[field] && (
          <p className="text-red-500 text-sm mt-1">{errors[field]}</p>
        )}
            </div>
          ))}
          <div className="flex space-x-2 mt-4">
            <button
              onClick={save}
              disabled={!isFormValid}
              className="px-4 py-2 bg-primaryColor text-white rounded disabled:opacity-50"
            >
              {t('userBillingDetails.save')}
            </button>
            <button
              onClick={() => { setEditMode(false); setErrors({}); }}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              {t('userBillingDetails.cancel')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {requiredFields.map(field => (
            <p key={field}>
              <strong>{field === 'companyName'
                ? (entityType === 'persFizica' ? t('userBillingDetails.fullName') + ':' : t('userBillingDetails.companyName') + ':')
                : (t(fieldLabels[field]) || field) + ':'}
              </strong>{' '}
              {(details as any)?.[field] ?? '-'}
            </p>
          ))}
          <button
            onClick={() => setEditMode(true)}
            className="mt-2 px-4 py-2 bg-primaryColor text-white rounded"
          >
            {details ? t('userBillingDetails.edit') : t('userBillingDetails.addDetails')}
          </button>
        </div>
      )}
    </div>
  );
}
