'use client';
import React, { forwardRef } from 'react';
import { useTranslation } from '@/hooks/useTranslation';

const SearchInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  const { t } = useTranslation();
  
  return (
    <input
      {...props}
      ref={ref}
      className='border border-gray-400 p-2 rounded-md w-full text-sm lg:text-md lg:w-50 py-3 focus:outline-primaryColor'
      placeholder={props.placeholder || t('search.searchPlaceholder')}
    />
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;
