"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function FeedbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const sessionId = params.get('sessionId');

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!sessionId) {
    return <p className="text-red-500">ID-ul sesiunii lipsește din URL.</p>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Alege un rating între 1 și 5 stele.');
      return;
    }

    setSubmitting(true);
    setError(null);
    
    try {
      const res = await fetch(`/api/video/session/${sessionId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la trimiterea feedback-ului.');
      }

      // După succes, redirecționează la dashboard sau pagina de mulțumire
      router.push('/profil');

    } catch (err: any) {
      console.error('Feedback error:', err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Feedback sesiune</h2>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rating:</label>
            <div className="flex space-x-1">
              {[1,2,3,4,5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl focus:outline-none ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">Comentariu (opțional):</label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              placeholder="Împărtășește-ți experiența..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Se trimite...' : 'Trimite feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}
