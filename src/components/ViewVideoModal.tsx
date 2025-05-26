// components/ViewVideoModal.tsx
'use client';

import React, { FC } from 'react';

export interface ViewVideoModalProps {
  /** URL complet YouTube, ex: https://www.youtube.com/watch?v=abc123 */
  videoUrl: string;
  /** Controlează afișarea modalului */
  isOpen: boolean;
  /** Callback pentru închiderea modalului */
  onClose: () => void;
}

const ViewVideoModal: FC<ViewVideoModalProps> = ({ videoUrl, isOpen, onClose }) => {
  if (!isOpen) return null;

  // Extragem ID-ul videoului din URL-ul normal YouTube
  let videoId = '';
  try {
    const url = new URL(videoUrl);
    videoId = url.searchParams.get('v') || '';
  } catch {
    // dacă e deja embed URL
    const match = videoUrl.match(/\/embed\/([^?&]+)/);
    videoId = match ? match[1] : '';
  }
  const embedUrl = `https://www.youtube.com/embed/${videoId}`;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
      onClick={onClose}
    >
      <div
        className="relative w-11/12 md:w-3/4 lg:w-1/2"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-white text-3xl leading-none"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="relative" style={{ paddingBottom: '56.25%', height: 0 }}>
          <iframe
            src={embedUrl}
            title="YouTube video player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute top-0 left-0 w-full h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default ViewVideoModal;
