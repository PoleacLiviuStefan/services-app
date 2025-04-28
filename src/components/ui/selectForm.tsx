import React, { ForwardedRef } from 'react';

interface SelectFormProps {
  values: string[];
  defaultValue: string;
  ref?: ForwardedRef<HTMLSelectElement>;
}

const SelectForm: React.FC<SelectFormProps> = ({ values, defaultValue, ref }) => {
  return (
    <select className='h-12 w-full rounded-lg border-1 text-black' ref={ref}>
      <option value="">{defaultValue}</option>
      {
        values.map((value: string, index: number) => (
          <option key={index} value={value}>{value}</option>
        ))
      }
    </select>
  );
};

export default SelectForm;
