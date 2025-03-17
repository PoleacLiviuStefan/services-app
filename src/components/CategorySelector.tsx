import React, { useState } from 'react'
import Button from './atoms/button';
import { MdArrowDropDown } from 'react-icons/md';

interface CategorySelectorProps {
    setSelectOption: (option: string) => void;
    options: string[];
    title: string;
    selectedOption: string;
}


const CategorySelector:React.FC<CategorySelectorProps> = ({setSelectOption,options,title,selectedOption}) => {

    const [showOptions, setShowOptions] = useState(false);

  return (
    <div>
        <Button
        onClick={() => {
          setShowOptions((prev) => !prev);
          console.log("showOptions ", showOptions);
        }}
        className="justify-between text-gray-500 border-primaryColor border px-3 py-1 w-full font-bold"
      >
        {title}
        <span
          className={`transition-all ease-in-out duration-300 text-2xl ${
            showOptions && "-rotate-90"
          }`}
        >
          <MdArrowDropDown />
        </span>
      </Button>

      <ul
  className={`flex flex-col w-full overflow-hidden transition-all ease-in-out duration-300 rounded-lg
    ${showOptions
      ? "max-h-96 py-2 gap-2 opacity-100 border border-black"
      : "max-h-0 py-0 gap-0 opacity-0 border-0"
    }
  `}
>


        {options.map((option, index) => (
          <li key={index}>
            <Button
              onClick={() => {
                setSelectOption(option);
                setShowOptions(false);
              }}
              className={`w-full px-2 py-2 ${
                selectedOption === option  && "bg-primaryColor text-white hov "} hover:bg-primaryColor/10`}
              horizontal={true}
            >
              {option}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CategorySelector