import React from 'react';
import { getServerTranslation } from '@/utils/serverTranslations';

type Language = 'ro' | 'en';

interface TranslatableTextProps {
  translationKey: string;
  defaultLang?: Language;
  params?: Record<string, string | number>;
  fallback?: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  children?: React.ReactNode;
}

/**
 * Componentă server-side pentru texte traduse
 * Poate fi folosită în Server Components fără probleme
 */
const TranslatableText: React.FC<TranslatableTextProps> = ({
  translationKey,
  defaultLang = 'ro',
  params,
  fallback,
  className,
  as: Component = 'span',
  children,
  ...props
}) => {
  const translatedText = getServerTranslation(translationKey, defaultLang, params);
  const displayText = translatedText === translationKey ? (fallback || translationKey) : translatedText;

  return (
    <Component className={className} {...props}>
      {displayText}
      {children}
    </Component>
  );
};

export default TranslatableText;

// Hook pentru folosire în componente mai complexe (server-side safe)
export const useServerTranslation = (defaultLang: Language = 'ro') => {
  return (key: string, params?: Record<string, string | number>) => 
    getServerTranslation(key, defaultLang, params);
};
