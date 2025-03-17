import React from 'react';





const Icon= ({ children }:{children:React.ReactNode}) => {
  return (
    <span className="flex justify-center items-center text-lg lg:text-xl w-8 lg:w-10 h-8 lg:h-10 text-white bg-gradient-to-t from-secondaryColor to-secondaryColor rounded-full shadow-md shadow-secondaryColor">
      {children}
    </span>
  );
};

export default Icon;
