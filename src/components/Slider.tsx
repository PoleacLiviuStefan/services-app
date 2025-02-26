'use client'
import React, { useState, useEffect } from 'react';
import ProviderCard from './ui/providerCard';
import person from '../../public/person.avif';
import Button from './atoms/button';
import SectionTitle from './ui/sectionTitle';
import { FaCaretLeft, FaCaretRight } from "react-icons/fa";

const Slider = () => {
  // Generăm o listă de 10 elemente
  const items = Array.from({ length: 10 }, (_, i) => i + 1);

  // Stări pentru configurarea sliderului în funcție de lățimea ferestrei
  const [visibleCount, setVisibleCount] = useState(4);
  const [cardWidth, setCardWidth] = useState(260);
  const [gap, setGap] = useState(13);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setContainerWidth(window.innerWidth);
      if (window.innerWidth < 768) {
        // Pe mobil, afișăm 1 card centrat
        setVisibleCount(1);
        setCardWidth(260);
        setGap(0);
      } else {
        // Pe desktop, folosim valorile implicite
        setVisibleCount(4);
        setCardWidth(260);
        setGap(13);
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculăm numărul de pagini
  const totalPages = items.length - visibleCount + 1;
  const [currentIndex, setCurrentIndex] = useState(0);

  // Slide automat la fiecare 5 secunde
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev < totalPages - 1 ? prev + 1 : 0));
    }, 5000);
    return () => clearInterval(interval);
  }, [totalPages]);

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : totalPages - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev < totalPages - 1 ? prev + 1 : 0));
  };

  const slideDistance = cardWidth + gap;
  // Dacă afișăm un singur card, calculăm extra padding pentru a-l centra:
  const extraPadding = visibleCount === 1 ? (containerWidth - cardWidth) / 2 : 0;

  return (
    <div className="flex flex-col items-center w-full space-y-8 h-full text-black mt-12">
      <SectionTitle>Psihologi Online</SectionTitle>
      
      {/* Containerul slider-ului */}
      <div className="relative w-full overflow-hidden">
        <div
          className="flex transition-transform duration-500"
          style={{
            transform: `translateX(-${currentIndex * slideDistance}px)`,
            paddingLeft: extraPadding,
            paddingRight: extraPadding,
          }}
        >
          {items.map((item, index) => (
            <div 
              key={index} 
              className="flex-shrink-0"
              style={{ width: `${cardWidth}px`, marginRight: `${gap}px` }}
            >
              <ProviderCard 
                name={`Provider ${item}`} 
                photo={person} 
                rating={4.5} 
                description="Lorem ipsum dolor sit amet, consectetur adipiscing elit." 
                reviews={Math.floor(Math.random() * 100)}
                speciality="Speciality"
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Navigare manuală: săgeți și paginare */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={goToPrevious} 
          className="flex justify-center items-center bg-gradient-to-t from-buttonPrimaryColor to-buttonSecondaryColor text-4xl w-12 h-12 rounded-full text-white"
        >
          <FaCaretLeft />
        </button>
        
        <ul className="flex space-x-2">
          {Array.from({ length: totalPages }).map((_, page) => (
            <li 
              key={page}
              className={`w-3 h-3 rounded-full cursor-pointer ${page === currentIndex ? 'bg-gray-600' : 'bg-gray-400'}`}
              onClick={() => setCurrentIndex(page)}
            ></li>
          ))}
        </ul>
        
        <button 
          onClick={goToNext} 
          className="flex justify-center items-center bg-gradient-to-t from-buttonPrimaryColor to-buttonSecondaryColor text-4xl w-12 h-12 rounded-full text-white"
        >
          <FaCaretRight />
        </button>
      </div>
      
      <div className="flex justify-center w-full">
        <Button className="bg-gradient-to-t border-2 border-buttonPrimaryColor/20 shadow-lg shadow-buttonPrimaryColor/40 from-buttonPrimaryColor to-buttonSecondaryColor px-8 py-4 text-md text-white font-semibold">
          VEZI TOTI ASTROLOGII
        </Button>
      </div>
    </div>
  );
};

export default Slider;
