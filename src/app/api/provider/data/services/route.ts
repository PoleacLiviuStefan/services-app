// pages/api/my-services.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Obținem sesiunea curentă
  const session = await getSession({ req });
  if (!session || !session.user?.email) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Căutăm utilizatorul după email și includem câmpul provider
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { provider: true },
  });

  if (!user || !user.provider) {
    return res.status(404).json({ error: 'Provider data not found for this user' });
  }

  // Obținem serviciile asociate provider-ului curent
  const services = await prisma.service.findMany({
    where: { providerId: user.provider.id },
  });

  return res.status(200).json({ services });
}
