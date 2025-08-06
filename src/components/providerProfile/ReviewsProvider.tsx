// components/ReviewsProvider.tsx
'use client';

import React, { FC } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import Review from '../Review';

export interface ReviewsProviderProps {
  reviews: Array<{
    id: string;
    comment?: string;
    date: string;       // ISO string
    rating: number;
    fromUser: {
      id: string;
      name: string;
      image?: string;
    };
  }>;
}

const ReviewsProvider: FC<ReviewsProviderProps> = ({ reviews }) => {
  const { t } = useTranslation();
  if (reviews.length === 0) {
    return <p className="text-gray-500">{t('reviewsProvider.noReviews')}</p>;
  }

  return (
    <div className="space-y-6">
      <h3 className='font-bold'>{t('reviewsProvider.allReviews')}</h3>
      {reviews.map((r) => (
        <Review
          key={r.id}
          userName={r.fromUser.name}
          service={r.service}
          date={r.date}
          rating={r.rating}
          comment={r.comment}
        />
      ))}
    </div>
  );
};

export default ReviewsProvider;
