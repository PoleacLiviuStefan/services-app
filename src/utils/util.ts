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
      // 1. Normalizăm Unicode și scoatem diacriticele
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      // 2. Înlocuim orice grup de caractere non-alfanumerice cu o singură cratimă
      .replace(/[^a-z0-9]+/g, "-")
      // 3. Eliminăm cratimele de la început și sfârșit (dacă au apărut)
      .replace(/^-+|-+$/g, "")
  );
}