// File: components/UserSessions.tsx

"use client";

import React, { useEffect, useState } from 'react';
import { formatDistanceToNow, parseISO, isValid } from 'date-fns';

interface SessionItem {
  id: string;
  startDate: string;   // ISO string or empty
  joinUrl: string;
  counterpart: string; // name of the other party (provider or client)
}

export default function UserSessions() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/user/sessions', { credentials: 'include' })
      .then(async res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        return res.json();
      })
      .then(data => {
        // filtrăm doar intrările cu startDate valid
        const valid = (data.sessions as SessionItem[]).filter(item =>
          item.startDate && isValid(parseISO(item.startDate))
        );
        setSessions(valid);
        setError(null);
      })
      .catch(err => setError(err.message || 'A apărut o eroare'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Se încarcă ședințele…</p>;
  if (error) return <p className="text-red-500">Eroare: {error}</p>;
  if (!sessions.length) return <p>Nu există ședințe programate.</p>;

  return (
    <ul className="space-y-4">
      {sessions.map(sess => {
        const date = parseISO(sess.startDate);
        const humanDate = date.toLocaleString('ro-RO', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
        const startsIn = formatDistanceToNow(date, { addSuffix: true });

        return (
          <li
            key={sess.id}
            className="border rounded-lg p-2 lg:p-4 shadow-sm flex justify-between items-center space-x-4"
          >
            <div>
              <p className="font-medium">Ședință cu {sess.counterpart}</p>
              <p className="text-sm text-gray-600">Programată pentru: {humanDate}</p>
              <p className="text-sm text-gray-600">în {startsIn}</p>
            </div>
            <a
              href={sess.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-primaryColor text-white rounded hover:bg-secondaryColor text-center"
            >
              Intră în ședință
            </a>
          </li>
        );
      })}
    </ul>
  );
}