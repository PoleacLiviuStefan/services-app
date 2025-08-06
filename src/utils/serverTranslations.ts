import translations from '@/utils/transl.json';

type Language = 'ro' | 'en';
type TranslationKey = string;

/**
 * Funcție pentru traduceri server-side (poate fi folosită în Server Components)
 * @param key - Cheia de traducere
 * @param lang - Limba dorită (default: 'ro')
 * @param params - Parametrii pentru interpolarea în text
 * @returns String-ul tradus
 */
export function getServerTranslation(
  key: TranslationKey, 
  lang: Language = 'ro', 
  params?: Record<string, string | number>
): string {
  try {
    const keys = key.split('.');
    let value: any = translations[lang];

    // Navighează prin obiectul de traduceri
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Fallback la română dacă nu găsește în engleză
        if (lang !== 'ro') {
          let fallbackValue: any = translations.ro;
          for (const fallbackKey of keys) {
            if (fallbackValue && typeof fallbackValue === 'object' && fallbackKey in fallbackValue) {
              fallbackValue = fallbackValue[fallbackKey];
            } else {
              return key;
            }
          }
          value = fallbackValue;
        } else {
          return key;
        }
        break;
      }
    }

    if (typeof value !== 'string') {
      return key;
    }

    // Înlocuiește parametrii în text dacă există
    if (params) {
      return Object.entries(params).reduce((text, [paramKey, paramValue]) => {
        return text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }, value);
    }

    return value;
  } catch (error) {
    console.warn(`Server translation error for key: ${key}`, error);
    return key;
  }
}

/**
 * Hook simplificat pentru server-side rendering
 * Returnează o funcție de traducere care folosește limba default
 */
export function createServerTranslator(defaultLang: Language = 'ro') {
  return (key: TranslationKey, params?: Record<string, string | number>) => 
    getServerTranslation(key, defaultLang, params);
}

// Exportă tipurile
export type { Language, TranslationKey };
