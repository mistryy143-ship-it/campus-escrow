// All REST calls go through here so headers + error handling live in one place.
const BASE_URL = import.meta.env.VITE_API_URL || "https://campus-escrow-api.onrender.com";

export async function api(path, { method = "GET", body, wallet, formData } = {}) {
  const headers = {};
  if (wallet) headers["x-wallet-address"] = wallet;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const url = `${BASE_URL}/api${path}`;

  const res = await fetch(url, {
    method,
    headers,
    body: formData ? formData : body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data.data;
}