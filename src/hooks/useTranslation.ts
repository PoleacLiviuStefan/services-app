
'use client';
import { useState, useEffect } from 'react';
import translations from '@/utils/transl.json';
import { getServerTranslation } from '@/utils/serverTranslations';

type Language = 'ro' | 'en';
type TranslationKey = string;

interface UseTranslationReturn {
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  language: Language;
  setLanguage: (lang: Language) => void;
  isLoading: boolean;
}

// Context pentru a stoca limba curentă global
let globalLanguage: Language = 'ro';
const languageListeners: Set<(lang: Language) => void> = new Set();

export const useTranslation = (): UseTranslationReturn => {
  const [language, setCurrentLanguage] = useState<Language>(globalLanguage);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Verifică localStorage pentru limba salvată
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'ro' || savedLanguage === 'en')) {
      globalLanguage = savedLanguage;
      setCurrentLanguage(savedLanguage);
    }

    // Adaugă listener pentru schimbări de limbă
    const listener = (lang: Language) => setCurrentLanguage(lang);
    languageListeners.add(listener);

    return () => {
      languageListeners.delete(listener);
    };
  }, []);

  const setLanguage = (lang: Language) => {
    console.log('🔄 Changing language to:', lang);
    setIsLoading(true);
    globalLanguage = lang;
    localStorage.setItem('language', lang);
    
    // Notifică toate componentele de schimbarea limbii
    console.log('📢 Notifying', languageListeners.size, 'listeners');
    languageListeners.forEach(listener => listener(lang));
    
    setTimeout(() => setIsLoading(false), 100);
  };

  const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
    // Folosește funcția server pentru consistență
    return getServerTranslation(key, language, params);
  };

  return {
    t,
    language,
    setLanguage,
    isLoading
  };
};

// Hook pentru componente care au nevoie doar de funcția de traducere
export const useT = () => {
  const { t } = useTranslation();
  return t;
};

// Funcție pentru a obține limba curentă fără hook
export const getCurrentLanguage = (): Language => globalLanguage;

// Funcție pentru a seta limba fără hook
export const setGlobalLanguage = (lang: Language) => {
  globalLanguage = lang;
  localStorage.setItem('language', lang);
  languageListeners.forEach(listener => listener(lang));
};
