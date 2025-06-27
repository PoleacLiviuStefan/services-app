import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  // Obține token-ul de sesiune utilizând NextAuth
  const session = await getToken({ req: request });

  // Verifică dacă utilizatorul este autentificat
  if (!session) {
    const loginUrl = new URL('/autentificare', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Dacă utilizatorul este autentificat, permite continuarea cererii
  return NextResponse.next();
}

// Specifică rutele pentru care se aplică middleware-ul
export const config = {
  matcher: [
    '/profil/:path*', 
    '/dashboard/:path*',
    '/api/chat/conversation/:path*' // Protejează și API-urile de conversație
  ],
};
