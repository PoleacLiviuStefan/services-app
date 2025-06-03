/**
 * Reprezintă un pachet de sesiuni oferit de provider.
 */
export interface Package {
  /** UUID-ul pachetului */
  id: string;
  /** Tipul serviciului: CHAT sau MEET */
  service: 'CHAT' | 'MEET';
  /** Numărul total de sesiuni incluse în pachet */
  totalSessions: number;
  /** Prețul în RON pentru întreg pachetul */
  price: number;
  /** Data creării pachetului (ISO string) */
  createdAt: string;
  /** Data expirării pachetului (ISO string) sau undefined dacă nu expiră */
  expiresAt?: string;
  providerStripeAccountId: string;
}
