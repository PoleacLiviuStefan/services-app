import React, { forwardRef } from 'react';

const SearchInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => {
  return (
    <input
      {...props}
      ref={ref}
      className='border border-gray-400 p-2 rounded-md w-full text-sm lg:text-md lg:w-50 py-3 focus:outline-primaryColor'
      placeholder={props.placeholder || 'Cauta un furnizor'}
    />
  );
});

SearchInput.displayName = 'SearchInput';

export default SearchInput;
