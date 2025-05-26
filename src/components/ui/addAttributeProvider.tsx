// src/components/AddAttributeProvider.tsx
import React from 'react';

interface AddAttributeProviderProps {
  title: string;
  selected: boolean;
  setSelect: (value: string) => void;
}

const AddAttributeProvider: React.FC<AddAttributeProviderProps> = ({
  title,
  selected,
  setSelect,
}) => {
  return (
    <li
      onClick={() => setSelect(title)}
      className={`
        flex w-full p-4 
        border border-dashed 
        border-primaryColor 
        rounded-lg 
        font-bold
        ${selected ? 'bg-primaryColor text-white' : 'bg-white text-black'} 
        hover:bg-primaryColor hover:text-white 
        transition-colors cursor-pointer
      `}
    >
      {title}
    </li>
  );
};

export default AddAttributeProvider;
