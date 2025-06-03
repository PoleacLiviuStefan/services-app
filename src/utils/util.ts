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
