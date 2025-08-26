declare namespace NodeJS {
  interface ProcessEnv {
    VITE_API_URL: string;
    VITE_MEDIA_URL: string;
    [key: string]: string | undefined;
  }
}
