import React, { forwardRef } from 'react';

interface InputFormProps {
  name: string;
  placeholder?: string; // Made optional with default value
  type?: string;
}

const InputForm = forwardRef<HTMLInputElement, InputFormProps>(
  ({ name, placeholder = "", type = "text" }, ref) => {
    return (
      <input
        ref={ref}
        name={name}
        type={type}
        placeholder={placeholder}
        className="w-full h-10 lg:h-12 p-2 lg:p-4 border-2 border-primaryColor focus:outline-none rounded-lg bg-white appearance-none"
      />
    );
  }
);

// DisplayName for better debugging
InputForm.displayName = "InputForm";

export default InputForm;