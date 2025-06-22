import { Invoice } from "./InvoiceInterface";

export interface BoughtPackage {
  id: string;
  providerId: string;
  packageId: string;
  totalSessions: number;
  usedSessions: number;
  createdAt: string;
  expiresAt: string | null;
  providerPackage: {
    service: string;
    totalSessions: number;
    price: number;
    createdAt: string;
    expiresAt: string | null;
  };
  provider: { user: { name: string } };
  invoices: Invoice[];
}

export interface SoldPackage {
  id: string;
  userId: string;
  packageId: string;
  totalSessions: number;
  usedSessions: number;
  createdAt: string;
  expiresAt: string | null;
  providerPackage: {
    service: string;
    totalSessions: number;
    price: number;
    createdAt: string;
    expiresAt: string | null;
  };
  user: { name: string };
  invoices: Invoice[];
}
