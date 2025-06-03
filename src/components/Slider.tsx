'use client';
import React, { useState, useEffect } from 'react';
import ProviderCard from './providerCard';
import Button from './atoms/button';
import SectionTitle from './ui/sectionTitle';
import { FaCaretLeft, FaCaretRight } from 'react-icons/fa';
import { ProviderInterface } from '@/interfaces/ProviderInterface';
import LoadingSkeleton from './ui/loadingSkeleton';

const Slider = () => {
  const [providers, setProviders] = useState<ProviderInterface[]>([]);
  const [loading, setLoading] = useState(true);

  // Stări pentru configurarea slider-ului în funcție de lățimea ferestrei
  const [visibleCount, setVisibleCount] = useState(4);
  const [cardWidth, setCardWidth] = useState(260);
  const [gap, setGap] = useState(13);
  const [containerWidth, setContainerWidth] = useState(0);

  // Index-ul curent în slider
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch providers de la API
  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/provider/get-providers?limit=12`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Eroare la obținerea providerilor');
      const data = await res.json();
      // data.providers ar trebui să fie ProviderInterface[]
      setProviders(data.providers || []);
    } catch (err) {
      console.error('Eroare la fetch providers:', err);
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  // La montare, setăm dimensiuni și încărcăm providerii
  useEffect(() => {
    const handleResize = () => {
      setContainerWidth(window.innerWidth);
      if (window.innerWidth < 768) {
        // Pe mobil, afișăm 1 card centrat
        setVisibleCount(1);
        setCardWidth(260);
        setGap(0);
      } else {
        // Pe desktop, afișăm 4 carduri
        setVisibleCount(4);
        setCardWidth(260);
        setGap(13);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    fetchProviders();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Calculăm numărul de pagini (posibilități de slide)
  const totalPages = Math.max(providers.length - visibleCount + 1, 0);

  // Slide automat la fiecare 5 secunde (doar dacă avem mai multe pagini)
  useEffect(() => {
    if (totalPages <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) =>
        prev < totalPages - 1 ? prev + 1 : 0
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [totalPages]);

  const goToPrevious = () => {
    if (totalPages <= 1) return;
    setCurrentIndex((prev) =>
      prev > 0 ? prev - 1 : totalPages - 1
    );
  };

  const goToNext = () => {
    if (totalPages <= 1) return;
    setCurrentIndex((prev) =>
      prev < totalPages - 1 ? prev + 1 : 0
    );
  };

  const slideDistance = cardWidth + gap;
  // Dacă afișăm un singur card, calculăm extra padding pentru a-l centra:
  const extraPadding =
    visibleCount === 1 ? (containerWidth - cardWidth) / 2 : 0;

  return (
    <div className="flex flex-col items-center w-full space-y-8 h-full text-black mt-12">
      <SectionTitle>Astrologi</SectionTitle>

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
          {loading
            ? // Afișăm skeleton-uri dacă încă se încarcă
              Array.from({ length: visibleCount }).map((_, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0"
                  style={{ width: `${cardWidth}px`, marginRight: `${gap}px` }}
                >
                  <LoadingSkeleton />
                </div>
              ))
            : // Când s-au încărcat providerii, îi afișăm
              providers.map((provider) => (
                <div
                  key={provider.id}
                  className="flex-shrink-0"
                  style={{ width: `${cardWidth}px`, marginRight: `${gap}px` }}
                >
                  <ProviderCard
                    name={provider.user?.name || 'N/A'}
                    image={provider.user?.image || ''}
                    rating={provider.averageRating}
                    description={provider.description || '—'}
                    reviews={provider.reviewsCount}
                    speciality={provider.mainSpeciality?.name || '—'}
                    tool={provider.mainTool}
                    reading={provider.reading}
                    forAdmin={false}
                    role={provider.role}
                    isProvider={true}
                    online={provider.online}
                  />
                </div>
              ))}
        </div>
      </div>

      {/* Navigare manuală: săgeți și paginare */}
      {totalPages > 0 && (
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPrevious}
            className="flex justify-center items-center bg-gradient-to-t from-buttonPrimaryColor to-buttonSecondaryColor text-2xl lg:text-4xl w-10 lg:w-12 h-10 lg:h-12 rounded-full text-white"
          >
            <FaCaretLeft />
          </button>

          <ul className="flex space-x-2">
            {Array.from({ length: totalPages }).map((_, page) => (
              <li
                key={page}
                className={`w-3 h-3 rounded-full cursor-pointer ${
                  page === currentIndex ? 'bg-gray-600' : 'bg-gray-400'
                }`}
                onClick={() => setCurrentIndex(page)}
              ></li>
            ))}
          </ul>

          <button
            onClick={goToNext}
            className="flex justify-center items-center bg-gradient-to-t from-buttonPrimaryColor to-buttonSecondaryColor text-2xl lg:text-4xl w-10 lg:w-12 h-10 lg:h-12 rounded-full text-white"
          >
            <FaCaretRight />
          </button>
        </div>
      )}

      <div className="flex justify-center w-full">
        <Button className="bg-gradient-to-t border-2 border-buttonPrimaryColor/20 shadow-lg shadow-buttonPrimaryColor/40 from-buttonPrimaryColor to-buttonSecondaryColor px-4 lg:px-8 py-2 lg:py-4 text-md text-white font-semibold">
          VEZI TOȚI ASTROLOGII
        </Button>
      </div>
    </div>
  );
};

export default Slider;
