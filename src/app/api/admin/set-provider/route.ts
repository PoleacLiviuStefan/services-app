// pages/api/set-provider.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Permit doar metoda POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Obține sesiunea curentă
  const session = await getSession({ req });
  if (!session || !session.user?.email) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  // Caută utilizatorul după email, incluzând relația Provider
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { provider: true },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Dacă utilizatorul este deja provider, returnează o eroare
  if (user.provider) {
    return res.status(400).json({ message: 'User is already a provider' });
  }

  // Creează înregistrarea Provider asociată utilizatorului
  const newProvider = await prisma.provider.create({
    data: {
      user: { connect: { id: user.id } },
      description: req.body.description || 'Furnizor de servicii', // descriere opțională
    },
  });

  return res.status(200).json({ provider: newProvider });
}
