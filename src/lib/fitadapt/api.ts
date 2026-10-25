/** Browser-to-XAMPP API bridge. Configure VITE_FITADAPT_API_URL in .env.local. */
export const FITADAPT_API_URL = (import.meta.env.VITE_FITADAPT_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function getDeviceKey(): string {
  const keyName = "fitadapt:device-key:v1";
  let key = window.localStorage.getItem(keyName);
  if (!key) {
    key = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(keyName, key);
  }
  return key;
}

export async function apiRequest<T>(route: string, init: RequestInit = {}): Promise<T> {
  if (!FITADAPT_API_URL) throw new Error("VITE_FITADAPT_API_URL is not configured");
  const response = await fetch(`${FITADAPT_API_URL}/index.php?route=${encodeURIComponent(route)}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-FitAdapt-Device": getDeviceKey(),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `FitAdapt API returned ${response.status}`);
  return payload as T;
}
