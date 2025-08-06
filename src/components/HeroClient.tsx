'use client';
import React from 'react';
import Button from './atoms/button';
import Image from 'next/image';
import element from '../../public/hero_element.png';
import { FaArrowAltCircleRight } from "react-icons/fa";
import Link from 'next/link';
import { useTranslation } from '@/hooks/useTranslation';

const HeroClient = () => {
  const { t } = useTranslation();

  return (
    <div className="relative flex justify-center items-center w-screen min-h-[600px] overflow-hidden bg-gradient-to-r from-primaryColor via-secondaryColor to-primaryColor bg-[length:200%_200%] animate-background-shift text-white">
      
      {/* Stratul cu stele peste tot */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(50)].map((_, index) => (
          <span
            key={index}
            className="absolute bg-white rounded-full"
            style={{
              width: `${Math.random() * 2 + 1}px`,   // Dimensiune între 1 și 3 pixeli
              height: `${Math.random() * 2 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.5,       // Opacitate între 0.5 și 1
              boxShadow: '0 0 8px rgba(255,255,255,0.8)',
            }}
          />
        ))}
      </div>

      <div className="flex flex-col lg:flex-row items-center lg:gap-16 z-40">
        <div className='flex flex-col lg:items-start items-center justify-center space-y-4 lg:space-y-8 text-left'>
          <h1 className="text-2xl lg:text-5xl text-center lg:text-left font-extrabold">
            {t('hero.title')} <span className='text-buttonSecondaryColor underline underline-offset-1 italic'>{t('hero.subtitle')}</span>
          </h1>
          <p className='font-semibold text-center lg:text-left text-sm lg:text-lg text-textPrimaryColor px-6 lg:px-0'>
            {t('hero.description')}
          </p>
          <div className='flex space-x-2'>
            <Link href="/astrologi">
            <Button horizontal={true} className='px-6 lg:px-12 py-2 lg:py-3 gap-3 lg:gap-6 shadow-lg shadow-buttonPrimaryColor/70 bg-gradient-to-t from-buttonPrimaryColor to-buttonSecondaryColor text-md lg:text-lg hover:text-white hover:bg-primaryColor font-semibold'>
              {t('hero.ctaButton')}
              <span className='text-white text-lg lg:text-2xl'>
                <FaArrowAltCircleRight />
              </span>
            </Button>
            </Link>
            {/* alte elemente */}
          </div>
        </div>
        <div className='flex flex-col items-left'>
          <div className='relative w-full h-full'>
            <Image src={element} alt="hero" className='hidden lg:block w-auto h-[400px] opacity-50' />
            <div className='hidden lg:block absolute top-1/2 left-1/2 h-[200px] w-[200px] rounded-full bg-white shadow-lg shadow-primaryColor/40 bg-gradient-to-tr from-primaryColor to-secondaryColor transform -translate-x-1/2 -translate-y-1/2'>
              {/* Alte elemente, dacă este cazul */}
            </div>
          </div>
        </div>
      </div>
      
      <Image src={element} alt="hero" className='lg:hidden absolute w-auto h-[300px] opacity-20' />
      
      {/* SVG pentru valuri */}
      <div className="absolute bottom-0 left-[-20%] min-w-[120%] overflow-hidden leading-[0]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 260">
          <path fill="#F5F5F5" fillOpacity="1" d="M0,288L30,272C60,256,120,224,180,224C240,224,300,256,360,245.3C420,235,480,181,540,176C600,171,660,213,720,234.7C780,256,840,256,900,245.3C960,235,1020,213,1080,213.3C1140,213,1200,235,1260,224C1320,213,1380,171,1410,149.3L1440,128L1440,320L1410,320C1380,320,1320,320,1260,320C1200,320,1140,320,1080,320C1020,320,960,320,900,320C840,320,780,320,720,320C660,320,600,320,540,320C480,320,420,320,360,320C300,320,240,320,180,320C120,320,60,320,30,320L0,320Z"></path>
        </svg>
      </div>
    </div>
  );
};

export default HeroClient;
