"use client";

import React from 'react';
import Button from '@/components/atoms/button';

interface EntityRequestApprovalProps {
  title: string;
  description?: string;
  price?: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdByName: string;
  createdAt: string;
  onApprove: () => void;
  onReject: () => void;
}

const EntityRequestApproval: React.FC<EntityRequestApprovalProps> = ({
  title,
  description,
  price,
  status,
  createdByName,
  createdAt,
  onApprove,
  onReject,
}) => {
  // Format date in Romanian locale
  const formattedDate = new Date(createdAt).toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="bg-white p-4 w-full lg:w-[200px] rounded shadow">
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-xs text-gray-500 mb-2">
        Creat de {createdByName} pe {formattedDate}
      </p>
      {description && <p className="text-sm text-gray-600 mb-2">{description}</p>}
      {price != null && <p className="text-sm text-gray-600 mb-4">Preț: {price}</p>}

      <div className="flex space-x-2">
        {status === 'PENDING' ? (
          <>
            <Button
              className="bg-green-400 text-white px-3 py-1 rounded hover:bg-green-500"
              onClick={onApprove}
            >
              Aproba
            </Button>
            <Button
              className="bg-red-400 text-white px-3 py-1 rounded hover:bg-red-500"
              onClick={onReject}
            >
              Respinge
            </Button>
          </>
        ) : status === 'APPROVED' ? (
          <span className="text-green-600 font-medium">Aprobat</span>
        ) : (
          <span className="text-red-600 font-medium">Respins</span>
        )}
      </div>
    </div>
  );
};

export default EntityRequestApproval;
