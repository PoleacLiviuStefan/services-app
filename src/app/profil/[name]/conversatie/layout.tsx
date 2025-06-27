// app/profil/[name]/conversatie/layout.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Folosește configurația ta existentă
import SessionProvider from '@/components/SessionProvider';

export default async function ConversationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
}