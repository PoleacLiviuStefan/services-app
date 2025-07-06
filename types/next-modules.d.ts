declare module 'next-auth/react' {
  // minimal Session interface
  export interface SessionUser {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    [key: string]: unknown;
  }

  export interface Session {
    user?: SessionUser | null;
    expires?: string;
    [key: string]: unknown;
  }

  export type SessionStatus = 'loading' | 'unauthenticated' | 'authenticated';

  export function useSession(): {
    data: Session | null;
    status: SessionStatus;
  };

  export function signIn(provider?: string, options?: Record<string, unknown>): Promise<void>;
  export function signOut(options?: Record<string, unknown>): Promise<void>;
}

declare module 'next/navigation' {
  export interface Router {
    push: (href: string) => void;
    back: () => void;
    refresh?: () => void;
    [key: string]: unknown;
  }

  export function useParams<T extends Record<string, string> = Record<string, string>>(): T;
  export function useRouter(): Router;
}

declare module 'lucide-react' {
  import * as React from 'react';
  export const ArrowLeft: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Mic: React.FC<React.SVGProps<SVGSVGElement>>;
  export const MicOff: React.FC<React.SVGProps<SVGSVGElement>>;
  export const Video: React.FC<React.SVGProps<SVGSVGElement>>;
  export const VideoOff: React.FC<React.SVGProps<SVGSVGElement>>;
  export const PhoneOff: React.FC<React.SVGProps<SVGSVGElement>>;
  export const MessageCircle: React.FC<React.SVGProps<SVGSVGElement>>;
}