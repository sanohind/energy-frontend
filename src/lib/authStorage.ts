const TOKEN_KEY = "auth_token";
const PERSIST_KEY = "auth_persist";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string, persist: boolean): void {
  clearToken();
  const storage = persist ? localStorage : sessionStorage;
  storage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PERSIST_KEY, persist ? "1" : "0");
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function shouldPersistAuth(): boolean {
  return localStorage.getItem(PERSIST_KEY) === "1";
}
