'use client'
import React from 'react';
import cn from 'classnames';

interface ButtonProps {
  children: React.ReactNode;
  textColor?: string;
  horizontal?: boolean;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: 'submit' | 'button';
}

const Button: React.FC<ButtonProps> = ({
  children,
  textColor,
  horizontal,
  className,
  type = "button",
  onClick = () => {}
}) => {
  // Condiționează stilizarea în funcție de prop-ul hero
  const baseClasses = cn(
    "flex items-center relative transition duration-300 ease-in-out rounded-md cursor-pointer text-left text-sm lg:text-md",
    horizontal ? 'justify-start' : "justify-center",
    textColor && `text-${textColor}`,
    className // stiluri suplimentare din exterior
  );

  return (
    <button className={baseClasses} onClick={onClick} type={type}>
      {children}
    </button>
  );
};

export default Button;
