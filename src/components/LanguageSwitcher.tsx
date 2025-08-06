'use client';
import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage, isLoading } = useTranslation();

  return (
    <div className="flex items-center space-x-2 z-50">
      <button
        onClick={() => setLanguage('ro')}
        disabled={isLoading}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          language === 'ro'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        RO
      </button>
      <button
        onClick={() => setLanguage('en')}
        disabled={isLoading}
        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
          language === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        EN
      </button>
      {isLoading && (
        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
