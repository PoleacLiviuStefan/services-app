import React from 'react';
import cn from 'classnames';

interface ButtonProps {
  children: React.ReactNode;
  textColor?: string;
  hero?: boolean;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  textColor,
  hero,
  className,
}) => {

  // Condiționează stilizarea în funcție de prop-ul hero
  const baseClasses = cn(
    "flex  items-center relative transition duration-300 ease-in-out rounded-md text-left",
    hero ? 'justify-start' : "justify-center", textColor && `text-${textColor}`,
    className // stiluri suplimentare din exterior
  );

  return (
    <button className={baseClasses}>
      {children}
    </button>
  );
};

export default Button;
