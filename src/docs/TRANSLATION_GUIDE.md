# 🌐 Sistem de Traduceri Bilingv - Next.js Compatible

Acest sistem oferă suport complet pentru traduceri române-engleze în aplicația Next.js cu suport pentru atât Server Components cât și Client Components.

## 🚨 Soluții pentru Problemele Client/Server

### Problema: "useTranslation() from the server"
Când folosești hook-uri în Server Components vei primi această eroare. Iată soluțiile:

## 📁 Structura Fișierelor Actualizată

```
src/
├── hooks/
│   └── useTranslation.ts           # Hook pentru Client Components
├── utils/
│   ├── transl.json                # Fișierul cu toate traducerile
│   ├── serverTranslations.ts      # Funcții pentru Server Components
│   └── translationUtils.ts        # Utilitare generale
├── components/
│   ├── LanguageSwitcher.tsx       # Client Component pentru limbă
│   ├── TranslatableText.tsx       # Server-safe component
│   ├── Hero.tsx                   # Server Component cu traduceri
│   ├── HeroClient.tsx             # Client Component alternativ
│   └── AuthForm.tsx               # Client Component complet
```

## 🔧 Utilizare în Server Components

### Opțiunea 1: Funcții Server-Side
```tsx
import { getServerTranslation } from '@/utils/serverTranslations';

// Server Component
const MyServerComponent = () => {
  const text = getServerTranslation('navigation.home', 'ro');
  
  return <h1>{text}</h1>;
};
```

### Opțiunea 2: Componenta TranslatableText
```tsx
import TranslatableText from '@/components/TranslatableText';

// Server Component 
const MyServerComponent = () => {
  return (
    <div>
      <TranslatableText 
        translationKey="hero.title" 
        as="h1" 
        className="text-2xl font-bold"
      />
      <TranslatableText 
        translationKey="hero.description" 
        as="p"
      />
    </div>
  );
};
```

### Opțiunea 3: Hook Server-Safe
```tsx
import { useServerTranslation } from '@/components/TranslatableText';

// Server Component
const MyServerComponent = () => {
  const t = useServerTranslation('ro');
  
  return (
    <div>
      <h1>{t('hero.title')}</h1>
      <p>{t('hero.description')}</p>
    </div>
  );
};
```

## 🎯 Utilizare în Client Components

### Hook Principal (doar pentru Client Components)
```tsx
'use client';
import { useTranslation } from '@/hooks/useTranslation';

const MyClientComponent = () => {
  const { t, language, setLanguage } = useTranslation();
  
  return (
    <div>
      <h1>{t('navigation.home')}</h1>
      <button onClick={() => setLanguage('en')}>
        Switch to English
      </button>
    </div>
  );
};
```

## 📋 Ghid de Decizie: Când să Folosești Ce

### ✅ Folosește Server Components când:
- Nu ai nevoie de interactivitate cu limba
- Vrei SEO optim
- Performanță maximă
- **Soluție**: `getServerTranslation()` sau `TranslatableText`

### ✅ Folosește Client Components când:
- Ai nevoie de switch dinamic de limbă
- Interactivitate complexă
- State management pentru limbă
- **Soluție**: `useTranslation()` hook

## 🚀 Strategii de Implementare

### Strategia 1: Hibridă (Recomandată)
```tsx
// Layout.tsx (Server Component)
import TranslatableText from '@/components/TranslatableText';
import Navbar from '@/components/Navbar'; // Client Component

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <Navbar /> {/* Client - cu switch de limbă */}
        <main>
          <TranslatableText translationKey="common.loading" />
          {children}
        </main>
      </body>
    </html>
  );
}

// Navbar.tsx (Client Component)
'use client';
import { useTranslation } from '@/hooks/useTranslation';

export default function Navbar() {
  const { t } = useTranslation();
  return <nav>{t('navigation.home')}</nav>;
}
```

### Strategia 2: Full Client (pentru debugging)
```tsx
// page.tsx
'use client';
import { useTranslation } from '@/hooks/useTranslation';

export default function Page() {
  const { t } = useTranslation();
  return <h1>{t('hero.title')}</h1>;
}
```

## 🎯 Componente Disponibile

### Server Components (pentru SEO optim)
- **Hero.tsx** - Server Component cu traduceri server-side
- **About.tsx** - Server Component cu TranslatableText
- **Curiosities.tsx** - Server Component cu getServerTranslation
- **Faq.tsx** - Server Component (versiunea originală păstrată)

### Client Components (pentru interactivitate dinamică)
- **HeroClient.tsx** - Client Component cu switch dinamic de limbă
- **AboutClient.tsx** - Client Component cu hook useTranslation
- **CuriositiesClient.tsx** - Client Component cu hook useTranslation
- **FaqClient.tsx** - Client Component complet tradus
- **Navbar.tsx** - Client Component cu LanguageSwitcher
- **Footer.tsx** - Client Component tradus
- **AuthForm.tsx** - Client Component pentru autentificare

### Strategii de Implementare Actualizate

#### Strategia 1: Hibridă cu Switch Dinamic (Recomandată)
```tsx
// page.tsx - folosește componente client pentru interactivitate
import HeroClient from '@/components/HeroClient';
import AboutClient from '@/components/AboutClient';
import CuriositiesClient from '@/components/CuriositiesClient';
import FaqClient from '@/components/FaqClient';

export default function Page() {
  return (
    <div>
      <HeroClient />
      <AboutClient />
      <CuriositiesClient />
      <FaqClient />
    </div>
  );
}
```

#### Strategia 2: Server-First pentru SEO
```tsx
// page.tsx - folosește componente server pentru încărcare rapidă
import Hero from '@/components/Hero';
import About from '@/components/About';
import Curiosities from '@/components/Curiosities';
import Faq from '@/components/Faq';

export default function Page() {
  return (
    <div>
      <Hero />
      <About />
      <Curiosities />
      <Faq />
    </div>
  );
}
```

#### Strategia 3: Mixed (Flexibilă)
```tsx
// page.tsx - combină ambele pentru echilibru optim
import Hero from '@/components/Hero'; // Server pentru SEO
import AboutClient from '@/components/AboutClient'; // Client pentru interactivitate
import Curiosities from '@/components/Curiosities'; // Server pentru performanță
import FaqClient from '@/components/FaqClient'; // Client pentru interactivitate

export default function Page() {
  return (
    <div>
      <Hero /> {/* SEO optim, încărcare rapidă */}
      <AboutClient /> {/* Interactivitate cu schimbarea limbii */}
      <Curiosities /> {/* Conținut static, performanță maximă */}
      <FaqClient /> {/* Conținut complex, interactivitate */}
    </div>
  );
}
```

## 🚀 Utilizare Rapidă

### 1. Importă hook-ul în componente

```tsx
import { useTranslation } from '@/hooks/useTranslation';

const MyComponent = () => {
  const { t, language, setLanguage } = useTranslation();
  
  return (
    <div>
      <h1>{t('navigation.home')}</h1>
      <p>{t('hero.description')}</p>
    </div>
  );
};
```

### 2. Folosește funcția de traducere

```tsx
// Traducere simplă
{t('auth.signIn')}  // → "Autentificare" (RO) | "Sign In" (EN)

// Traducere cu parametrii
{t('packages.showing', { count: 5, total: 20 })}
// JSON: "Afișează {{count}} din {{total}} pachete"
// Rezultat: "Afișează 5 din 20 pachete"
```

### 3. Adaugă switch-erul de limbă

```tsx
import LanguageSwitcher from '@/components/LanguageSwitcher';

<LanguageSwitcher />
```

## 📝 Structura JSON-ului de Traduceri

```json
{
  "ro": {
    "navigation": {
      "home": "ACASA",
      "login": "Autentificare"
    },
    "auth": {
      "signIn": "Autentificare",
      "email": "Email"
    }
  },
  "en": {
    "navigation": {
      "home": "HOME",
      "login": "Login"
    },
    "auth": {
      "signIn": "Sign In",
      "email": "Email"
    }
  }
}
```

## 🎯 Categorii Disponibile

- **navigation** - Meniu și navigare
- **auth** - Autentificare și înregistrare
- **profile** - Gestionarea profilului
- **packages** - Pachete cumpărate/oferite
- **sessions** - Ședințe programate/completate
- **conversations** - Sistemul de mesagerie
- **billing** - Date de facturare
- **admin** - Panoul de administrare
- **hero** - Pagina principală
- **provider** - Paginile de provider
- **footer** - Subsol site
- **common** - Elemente comune (butoane, stări)
- **errors** - Mesaje de eroare
- **success** - Mesaje de succes

## 🔧 Funcții Utilitare

```tsx
import { 
  getTranslation, 
  hasTranslation, 
  getCategoryTranslations,
  validateTranslations 
} from '@/utils/translationUtils';

// Obține traducere fără hook
const text = getTranslation('auth.signIn', 'en');

// Verifică dacă există traducerea
if (hasTranslation('auth.newKey')) {
  // ...
}

// Obține toate traducerile pentru navigare
const navTranslations = getCategoryTranslations('navigation', 'en');

// Validează structura traducerilor
const { isValid, errors } = validateTranslations();
```

## 🔄 Migrarea Componentelor Existente

### Înainte:
```tsx
<button>Autentificare</button>
<h1>Ghidarea ta astrală</h1>
```

### După:
```tsx
import { useTranslation } from '@/hooks/useTranslation';

const { t } = useTranslation();

<button>{t('auth.signIn')}</button>
<h1>{t('hero.title')}</h1>
```

## 📋 Pași pentru Migrarea Unei Componente

1. **Importă hook-ul:**
   ```tsx
   import { useTranslation } from '@/hooks/useTranslation';
   ```

2. **Inițializează hook-ul:**
   ```tsx
   const { t } = useTranslation();
   ```

3. **Înlocuiește textele:**
   ```tsx
   // Vechiul text: "Autentificare"
   // Noul text: {t('auth.signIn')}
   ```

4. **Adaugă cheia în JSON dacă nu există:**
   ```json
   "auth": {
     "signIn": "Autentificare"  // RO
   }
   ```

## 💡 Best Practices

### ✅ Bine
```tsx
// Folosește chei descriptive
{t('auth.loginButton')}
{t('profile.editAvatar')}
{t('sessions.scheduleNew')}

// Grupează logic
{t('navigation.home')}
{t('navigation.profile')}
```

### ❌ Evită
```tsx
// Chei generale
{t('button1')}
{t('text2')}

// Hardcodare
"Autentificare"
```

## 🔍 Debugging

1. **Verifică cheia în JSON:**
   ```bash
   # Caută cheia în fișier
   grep -r "signIn" src/utils/transl.json
   ```

2. **Validează structura:**
   ```tsx
   import { validateTranslations } from '@/utils/translationUtils';
   console.log(validateTranslations());
   ```

3. **Verifică limba curentă:**
   ```tsx
   const { language } = useTranslation();
   console.log('Current language:', language);
   ```

## 🚀 Lansare în Producție

1. **Testează ambele limbi**
2. **Validează toate traducerile**
3. **Verifică localStorage-ul pentru limba salvată**
4. **Testează switch-erul de limbă**

## 📚 Exemple Complete

Vezi componentele actualizate:
- `src/components/Navbar.tsx` - Navigare tradusă
- `src/components/Hero.tsx` - Hero section tradus  
- `src/components/AuthForm.tsx` - Formular complet tradus

Sistemul este gata de utilizare și scalabil pentru adăugarea de noi traduceri! 🎉
