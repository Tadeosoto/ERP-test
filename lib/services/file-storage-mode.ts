/** En Vercel no hay disco persistente; los PDF van a PostgreSQL. */
export function useDatabaseFileStorage(): boolean {
  if (process.env.FILES_STORAGE === "database") return true;
  if (process.env.FILES_STORAGE === "disk") return false;
  return process.env.VERCEL === "1";
}
