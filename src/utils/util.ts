export const getOptionName = (option: string | { name: string }) => {
    return typeof option === 'string' ? option : option.name;
  };
  
export const isError = (err: unknown): err is Error => {
    return err instanceof Error;
  }