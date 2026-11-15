const TOKEN_KEY = 'rm_token';

export const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      if (value === null || value === undefined) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(value));
    } catch { /* private mode */ }
  },
};

export const getToken = () => store.get(TOKEN_KEY);
export const setToken = (t) => store.set(TOKEN_KEY, t);

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.message || 'Something went wrong. Please try again.');
    this.status = status;
    this.data = data;
  }
}

/** Call the API. body can be an object (sent as JSON) or FormData. */
export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  let payload;
  if (body instanceof FormData) payload = body;
  else if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload, signal });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError(0, { message: 'No connection. Please check your internet and try again.' });
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401 && token) window.dispatchEvent(new Event('rm:logout'));
    throw new ApiError(res.status, data);
  }
  return data;
}

export const qs = (params) => {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') u.set(k, v); });
  const s = u.toString();
  return s ? `?${s}` : '';
};

/** Shrink a photo in the browser before upload (keeps uploads small and fast on mobile data). */
export async function shrinkImage(file, max = 1400, quality = 0.84) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 900 * 1024) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
    return blob ? new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

export const rwf = (n) => `${Number(n || 0).toLocaleString('en-US')} RWF`;
export const avatarOf = (u) => u?.avatar || '/img/profile.jpeg';
export const dateOf = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => (d ? new Date(d).toLocaleDateString('en-GB', opts) : '');
export const timeAgo = (d) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return dateOf(d);
};
