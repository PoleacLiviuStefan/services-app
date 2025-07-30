export const getOptionName = (option: string | { name: string }) => {
    return typeof option === 'string' ? option : option.name;
  };
  
export const isError = (err: unknown): err is Error => {
    return err instanceof Error;
  }

export function formatForUrl(str: string): string {
  return (
    str
      .toLowerCase()
      // Înlocuim fiecare grup de caractere care NU este:
      //   - litera a–z
      //   - cifră 0–9
      //   - una dintre literele românești: ăâîșț
      // cu o singură cratimă
      .replace(/[^a-z0-9ăâîșț]+/g, "-")
      // Dacă există mai multe cratime consecutive, reducem toate la una singură
      .replace(/-+/g, "-")
      // Eliminăm cratimele de la început și sfârșit (dacă au rămas)
      .replace(/^-+|-+$/g, "")
  );
}


export function generateConversationUrl(user: { name?: string | null; email?: string | null }): string {
  // Preferă numele formatat, dacă nu există folosește email-ul
  if (user.name) {
    return formatForUrl(user.name);
  }
  
  if (user.email) {
    return user.email; // Email-ul îl lăsăm ca atare în URL
  }
  
  throw new Error('User must have either name or email');
}

// Helper pentru a crea link-uri către conversații
export function createConversationLink(user: { name?: string | null; email?: string | null }): string {
  const urlIdentifier = generateConversationUrl(user);
  return `/profil/${encodeURIComponent(urlIdentifier)}/conversatie`;
}

export function extractYouTubeId(videoUrl: string): string {
  try {
    const url = new URL(videoUrl);
    const host = url.hostname.replace(/^www\./, '');

    // 1. Short link: youtu.be/abc123
    if (host === 'youtu.be') {
      return url.pathname.slice(1);
    }

    // 2. Shorts: youtube.com/shorts/abc123
    const shortsMatch = url.pathname.match(/\/shorts\/([^?&]+)/);
    if (shortsMatch) {
      return shortsMatch[1];
    }

    // 3. Standard watch: youtube.com/watch?v=abc123
    const v = url.searchParams.get('v');
    if (v) {
      return v;
    }

    // 4. Embed: youtube.com/embed/abc123
    const embedMatch = url.pathname.match(/\/embed\/([^?&]+)/);
    if (embedMatch) {
      return embedMatch[1];
    }

    return '';
  } catch {
    // direct ID (11 caractere)
    const idMatch = videoUrl.match(/^[\w-]{11}$/);
    return idMatch ? idMatch[0] : '';
  }
}
