declare module 'next-auth/react' {
  import * as React from 'react';
  const mod: any;
  export default mod;
  export * from mod;
}

declare module 'next/navigation' {
  const mod: any;
  export const useParams: () => Record<string, string>;
  export const useRouter: () => any;
  export default mod;
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