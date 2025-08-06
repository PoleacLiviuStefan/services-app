import { getServerTranslation } from '@/utils/serverTranslations';
import { validateTranslations } from '@/utils/translationUtils';

/**
 * Test pentru verificarea funcționalității traducerilor server-side
 */
export function testServerTranslations() {
  console.log('🧪 Testing Server Translations...');
  
  // Test basic
  const homeRo = getServerTranslation('navigation.home', 'ro');
  const homeEn = getServerTranslation('navigation.home', 'en');
  
  console.log('✅ Basic test:', { homeRo, homeEn });
  
  // Test cu parametrii
  const withParams = getServerTranslation('packages.showing', 'ro', { count: 5, total: 20 });
  console.log('✅ Parameters test:', withParams);
  
  // Test fallback
  const fallback = getServerTranslation('nonexistent.key', 'en');
  console.log('✅ Fallback test:', fallback);
  
  // Test validare
  const validation = validateTranslations();
  console.log('✅ Validation:', validation);
  
  console.log('🎉 All server translation tests completed!');
}

/**
 * Funcție pentru debugging problemelor de traducere
 */
export function debugTranslation(key: string, lang: 'ro' | 'en' = 'ro') {
  console.log(`🔍 Debugging translation for key: ${key}, lang: ${lang}`);
  
  try {
    const result = getServerTranslation(key, lang);
    console.log(`✅ Result: "${result}"`);
    
    if (result === key) {
      console.log('⚠️  Warning: Translation key returned as-is (not found)');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error during translation:', error);
    return key;
  }
}

/**
 * Lista cu toate cheile de traducere disponibile pentru debugging
 */
export const availableKeys = {
  navigation: [
    'navigation.home',
    'navigation.psychologists', 
    'navigation.about',
    'navigation.profile',
    'navigation.login',
    'navigation.logout'
  ],
  auth: [
    'auth.signIn',
    'auth.signUp',
    'auth.email',
    'auth.password',
    'auth.confirmPassword'
  ],
  hero: [
    'hero.title',
    'hero.subtitle', 
    'hero.description',
    'hero.ctaButton'
  ],
  common: [
    'common.loading',
    'common.error',
    'common.success',
    'common.save',
    'common.cancel'
  ]
};

// Export pentru utilizare în dezvoltare
if (typeof window !== 'undefined') {
  (window as any).debugTranslation = debugTranslation;
  (window as any).testServerTranslations = testServerTranslations;
  (window as any).availableKeys = availableKeys;
}
