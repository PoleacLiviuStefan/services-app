'use client'
import React, { useState, useRef, useEffect } from 'react';

interface FaqQuestionProps {
  title: string;
  answer: string | React.ReactElement;
}

const FaqQuestion: React.FC<FaqQuestionProps> = ({ title, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [height, setHeight] = useState('0px');
  const contentRef = useRef<HTMLDivElement>(null);

  const toggleOpen = () => {
    setIsOpen(prev => !prev);
  };

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isOpen ? `${contentRef.current.scrollHeight}px` : '0px');
    }
  }, [isOpen]);

  return (
    <div className="border-b py-2">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={toggleOpen}
      >
        <h3 className="text-lg font-medium">{title}</h3>
        <span
          className={`transform transition-transform duration-300 ${
            isOpen ? 'rotate-45' : 'rotate-0'
          }`}
        >
          +
        </span>
      </div>

      <div
        ref={contentRef}
        style={{
          height,
          overflow: 'hidden',
          transition: 'height 0.3s ease'
        }}
      >
        <div className="py-2">
          {answer}
        </div>
      </div>
    </div>
  );
};

export default FaqQuestion;
