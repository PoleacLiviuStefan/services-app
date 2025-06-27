// utils/userResolver.ts
import { formatForUrl } from '@/utils/util';

/**
 * Rezolvă un identificator de utilizator (nume formatat sau email) 
 * înapoi la numele real din baza de date
 */
export function resolveUserIdentifier(identifier: string, users: { name: string; email: string }[]): string | null {
  if (!identifier || !users.length) return null;

  // Decodifică URL-ul mai întâi
  const decodedIdentifier = decodeURIComponent(identifier).toLowerCase();

  // 1. Încearcă să găsească direct după email (dacă conține @)
  if (decodedIdentifier.includes('@')) {
    const user = users.find(u => u.email?.toLowerCase() === decodedIdentifier);
    return user?.name || null;
  }

  // 2. Încearcă să găsească după numele formatat
  const userByFormattedName = users.find(u => {
    if (!u.name) return false;
    const formattedName = formatForUrl(u.name).toLowerCase();
    return formattedName === decodedIdentifier;
  });

  if (userByFormattedName) {
    return userByFormattedName.name;
  }

  // 3. Încearcă să găsească după numele direct (fără formatare)
  const userByDirectName = users.find(u => 
    u.name?.toLowerCase() === decodedIdentifier
  );

  if (userByDirectName) {
    return userByDirectName.name;
  }

  // 4. Căutare parțială în nume (înlocuiește cratimele cu spații)
  const searchName = decodedIdentifier.replace(/-/g, ' ');
  const userByPartialName = users.find(u =>
    u.name?.toLowerCase().includes(searchName) ||
    searchName.includes(u.name?.toLowerCase() || '')
  );

  return userByPartialName?.name || null;
}

/**
 * Creează un URL de conversație din numele unui utilizator
 */
export function createConversationUrl(userName: string): string {
  const formattedName = formatForUrl(userName);
  return `/profil/${formattedName}/conversatie`;
}

/**
 * Normalizează numele pentru comparație (elimină encoding, spații extra, etc.)
 */
export function normalizeUserName(name: string): string {
  return decodeURIComponent(name).trim();
}

// ===== FUNCȚII NOI PENTRU CHAT =====

/**
 * Convertește un nume din URL înapoi la forma originală
 * Folosește logica inversă a formatForUrl()
 */
export function decodeUsernameFromUrl(urlName: string): string {
  const decodedName = decodeURIComponent(urlName);
  // Înlocuiește cratimele cu spații (dacă formatForUrl folosește cratimă)
  return decodedName.replace(/-/g, ' ');
}

/**
 * Generează conversationId folosind numele reale cu spații
 * Sortează numele pentru consistență
 */
export function generateConversationId(user1: string, user2: string): string {
  return [user1.trim(), user2.trim()].sort().join('-');
}

/**
 * Rezolvă numele real al utilizatorului pentru chat
 * Folosește lista de utilizatori dacă este disponibilă
 */
export async function resolveRecipientName(
  urlName: string, 
  users?: { name: string; email: string }[]
): Promise<string> {
  
  if (users && users.length > 0) {
    // Folosește logica existentă dacă avem lista de utilizatori
    const resolvedName = resolveUserIdentifier(urlName, users);
    if (resolvedName) {
      return resolvedName;
    }
  }
  
  // Fallback: decodează manual din URL
  return decodeUsernameFromUrl(urlName);
}