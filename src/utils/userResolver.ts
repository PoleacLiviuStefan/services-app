// utils/userResolver.ts - ACTUALIZAT pentru sistemul de slug-uri
import { formatForUrl } from '@/utils/helper'; // folosește funcția existentă

/**
 * 🆕 Generează conversation ID folosind slug-uri
 * Sortează slug-urile pentru consistență
 */
export function generateConversationId(userSlug1: string, userSlug2: string): string {
  if (!userSlug1 || !userSlug2) {
    throw new Error('Both user slugs are required for conversation ID');
  }
  return [userSlug1.trim(), userSlug2.trim()].sort().join('-');
}

/**
 * 🆕 Creează URL de conversație folosind slug-ul
 */
export function createConversationUrl(userSlug: string): string {
  if (!userSlug) {
    throw new Error('User slug is required for conversation URL');
  }
  return `/profil/${formatForUrl(userSlug)}/conversatie`;
}

/**
 * 🆕 Creează URL de profil folosind slug-ul
 */
export function createProfileUrl(userSlug: string): string {
  if (!userSlug) {
    throw new Error('User slug is required for profile URL');
  }
  return `/profil/${encodeURIComponent(userSlug)}`;
}

/**
 * 🆕 Validează format de slug
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  
  // Slug-ul trebuie să conțină doar litere mici, cifre, cratimă și caractere românești
  const slugPattern = /^[a-z0-9ăâîșț]+(-[a-z0-9ăâîșț]+)*$/;
  return slugPattern.test(slug);
}

/**
 * 🆕 Compară doi slug-uri (case insensitive, pentru siguranță)
 */
export function slugsEqual(slug1: string, slug2: string): boolean {
  if (!slug1 || !slug2) return false;
  return slug1.toLowerCase().trim() === slug2.toLowerCase().trim();
}

// 🗑️ DEPRECATED - Funcții pentru sistemul vechi (păstrate pentru backwards compatibility)
// Aceste funcții vor fi eliminate în viitoarele versiuni

/**
 * @deprecated Folosește căutare directă în baza de date după slug în loc de această funcție
 * Rezolvă un identificator de utilizator înapoi la numele real din baza de date
 */
export function resolveUserIdentifier(identifier: string, users: { name: string; email: string }[]): string | null {
  console.warn('⚠️ resolveUserIdentifier este deprecated. Folosește căutare după slug în baza de date.');
  
  if (!identifier || !users.length) return null;

  const decodedIdentifier = decodeURIComponent(identifier).toLowerCase();

  // 1. Încearcă după email
  if (decodedIdentifier.includes('@')) {
    const user = users.find(u => u.email?.toLowerCase() === decodedIdentifier);
    return user?.name || null;
  }

  // 2. Încearcă după numele formatat
  const userByFormattedName = users.find(u => {
    if (!u.name) return false;
    const formattedName = formatForUrl(u.name).toLowerCase();
    return formattedName === decodedIdentifier;
  });

  return userByFormattedName?.name || null;
}

/**
 * @deprecated Folosește session.user.slug direct
 * Normalizează numele pentru comparație
 */
export function normalizeUserName(name: string): string {
  console.warn('⚠️ normalizeUserName este deprecated. Folosește slug-uri în loc de normalizarea numelor.');
  return decodeURIComponent(name).trim();
}

/**
 * @deprecated Nu mai e necesară cu sistemul de slug-uri
 * Convertește un nume din URL înapoi la forma originală
 */
export function decodeUsernameFromUrl(urlName: string): string {
  console.warn('⚠️ decodeUsernameFromUrl este deprecated. Folosește slug-uri în loc de decodarea numelor din URL.');
  const decodedName = decodeURIComponent(urlName);
  return decodedName.replace(/-/g, ' ');
}

/**
 * @deprecated Folosește găsirea utilizatorului în baza de date după slug
 * Rezolvă numele real al utilizatorului pentru chat
 */
export async function resolveRecipientName(
  urlName: string, 
  users?: { name: string; email: string }[]
): Promise<string> {
  console.warn('⚠️ resolveRecipientName este deprecated. Caută utilizatorul în baza de date după slug.');
  
  if (users && users.length > 0) {
    const resolvedName = resolveUserIdentifier(urlName, users);
    if (resolvedName) {
      return resolvedName;
    }
  }
  
  return decodeUsernameFromUrl(urlName);
}

// 🆕 UTILITY FUNCTIONS pentru noul sistem

/**
 * 🆕 Type guard pentru a verifica dacă un obiect are slug
 */
export function hasSlug(user: any): user is { slug: string } {
  return user && typeof user.slug === 'string' && user.slug.length > 0;
}

/**
 * 🆕 Type guard pentru utilizatori completi (cu ID, nume și slug)
 */
export function isCompleteUser(user: any): user is { id: string; name: string; slug: string } {
  return user && 
         typeof user.id === 'string' && 
         typeof user.name === 'string' && 
         typeof user.slug === 'string' &&
         user.id.length > 0 && 
         user.name.length > 0 && 
         user.slug.length > 0;
}

/**
 * 🆕 Extrage slug-ul dintr-un utilizator (din sesiune sau din baza de date)
 */
export function extractUserSlug(user: any): string | null {
  if (!user) return null;
  
  // Din sesiunea NextAuth
  if (user.slug) return user.slug;
  
  // Din obiectul de utilizator din baza de date
  if (user.user?.slug) return user.user.slug;
  
  // Fallback: generează din nume dacă există
  if (user.name) {
    console.warn('⚠️ Generez slug din nume. Consideră să actualizezi baza de date cu slug-uri.');
    return formatForUrl(user.name);
  }
  
  return null;
}

/**
 * 🆕 Construiește obiect utilizator standardizat
 */
export function standardizeUser(userData: any): {
  id: string;
  name: string;
  slug: string;
  email?: string;
  image?: string;
} | null {
  if (!userData) return null;
  
  const user = userData.user || userData; // Handel both formats
  
  if (!isCompleteUser(user)) {
    console.error('❌ Date utilizator incomplete:', user);
    return null;
  }
  
  return {
    id: user.id,
    name: user.name,
    slug: user.slug,
    email: user.email || userData.email,
    image: user.image || userData.image
  };
}

// 🆕 HELPER FUNCTIONS pentru debugging

/**
 * 🆕 Debug info pentru utilizatori
 */
export function debugUser(user: any, context: string = ''): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  console.log(`🔍 Debug User ${context}:`, {
    hasUser: !!user,
    hasId: !!user?.id,
    hasName: !!user?.name,
    hasSlug: !!user?.slug,
    slug: user?.slug,
    name: user?.name,
    isComplete: isCompleteUser(user)
  });
}

/**
 * 🆕 Debug info pentru conversații
 */
export function debugConversation(user1: any, user2: any, context: string = ''): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  const slug1 = extractUserSlug(user1);
  const slug2 = extractUserSlug(user2);
  
  console.log(`💬 Debug Conversation ${context}:`, {
    user1: { name: user1?.name, slug: slug1 },
    user2: { name: user2?.name, slug: slug2 },
    conversationId: slug1 && slug2 ? generateConversationId(slug1, slug2) : 'INVALID'
  });
}