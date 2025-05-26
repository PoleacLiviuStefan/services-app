import React, { forwardRef } from 'react';

interface InputFormProps {
  name: string;
  placeholder?: string; // rămâne opțional, cu default ""
  type?: string;        // rămâne opțional, cu default "text"
  max?: string;         // nou: max opțional, de ex. pentru <input type="date">
}

const InputForm = forwardRef<HTMLInputElement, InputFormProps>(
  ({ name, placeholder = "", type = "text", max }, ref) => {
    return (
      <input
        ref={ref}
        name={name}
        type={type}
        placeholder={placeholder}
        max={max}
        className="w-full h-10 lg:h-12 p-2 lg:p-4 border-2 border-primaryColor focus:outline-none rounded-lg bg-white appearance-none"
      />
    );
  }
);

InputForm.displayName = "InputForm";

export default InputForm;
