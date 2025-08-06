import translations from '@/utils/transl.json';

type Language = 'ro' | 'en';

/**
 * Obține traducerea pentru o cheie specifică
 * @param key - Cheia de traducere (ex: 'navigation.home')
 * @param lang - Limba dorită ('ro' sau 'en')
 * @param params - Parametrii pentru interpolarea în text
 * @returns String-ul tradus sau cheia dacă nu se găsește traducerea
 */
export function getTranslation(
  key: string, 
  lang: Language = 'ro', 
  params?: Record<string, string | number>
): string {
  try {
    const keys = key.split('.');
    let value: any = translations[lang];

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

    // Înlocuiește parametrii în text
    if (params) {
      return Object.entries(params).reduce((text, [paramKey, paramValue]) => {
        return text.replace(new RegExp(`{{${paramKey}}}`, 'g'), String(paramValue));
      }, value);
    }

    return value;
  } catch (error) {
    console.warn(`Translation error for key: ${key}`, error);
    return key;
  }
}

/**
 * Verifică dacă o cheie de traducere există
 * @param key - Cheia de traducere
 * @param lang - Limba dorită
 * @returns true dacă cheia există
 */
export function hasTranslation(key: string, lang: Language = 'ro'): boolean {
  try {
    const keys = key.split('.');
    let value: any = translations[lang];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return false;
      }
    }

    return typeof value === 'string';
  } catch {
    return false;
  }
}

/**
 * Obține toate traducerile pentru o categorie
 * @param category - Categoria de traduceri (ex: 'navigation')
 * @param lang - Limba dorită
 * @returns Obiect cu toate traducerile din categoria respectivă
 */
export function getCategoryTranslations(
  category: string, 
  lang: Language = 'ro'
): Record<string, any> {
  try {
    return translations[lang][category as keyof typeof translations[typeof lang]] || {};
  } catch {
    return {};
  }
}

/**
 * Obține lista tuturor cheilor de traducere disponibile
 * @param lang - Limba dorită
 * @returns Array cu toate cheile disponibile
 */
export function getAllTranslationKeys(lang: Language = 'ro'): string[] {
  const keys: string[] = [];
  
  const traverse = (obj: any, prefix = '') => {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          traverse(obj[key], fullKey);
        } else {
          keys.push(fullKey);
        }
      }
    }
  };

  traverse(translations[lang]);
  return keys;
}

/**
 * Formatează un text cu parametrii
 * @param text - Textul de formatat
 * @param params - Parametrii pentru formatare
 * @returns Textul formatat
 */
export function formatText(text: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce((formattedText, [key, value]) => {
    return formattedText.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }, text);
}

/**
 * Validează structura fișierului de traduceri
 * @returns Obiect cu rezultatul validării
 */
export function validateTranslations(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const roKeys = getAllTranslationKeys('ro');
    const enKeys = getAllTranslationKeys('en');
    
    // Verifică dacă toate cheile din română există și în engleză
    const missingInEnglish = roKeys.filter(key => !enKeys.includes(key));
    if (missingInEnglish.length > 0) {
      errors.push(`Missing English translations for: ${missingInEnglish.join(', ')}`);
    }
    
    // Verifică dacă toate cheile din engleză există și în română
    const missingInRomanian = enKeys.filter(key => !roKeys.includes(key));
    if (missingInRomanian.length > 0) {
      errors.push(`Missing Romanian translations for: ${missingInRomanian.join(', ')}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    errors.push(`Validation error: ${error}`);
    return {
      isValid: false,
      errors
    };
  }
}

// Exportă tipurile pentru TypeScript
export type { Language };
export type TranslationKey = string;
export type TranslationParams = Record<string, string | number>;
