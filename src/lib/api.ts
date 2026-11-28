export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// Held strictly in JS module memory so iframe sessions work without exposing tokens to Web Storage.
let inMemoryAuthToken: string | null = null;

export function setAuthToken(token: string | null | undefined) {
  inMemoryAuthToken = token && token.trim() ? token.trim() : null;
}

export function getAuthToken(): string | null {
  return inMemoryAuthToken;
}

export async function apiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (inMemoryAuthToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${inMemoryAuthToken}`;
  }
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  const text = await res.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  if (res.status === 401 && url === '/api/auth/me') {
    inMemoryAuthToken = null;
  }

  if (!res.ok) {
    const rawErr = typeof data.error === 'string' ? data.error.trim() : '';
    const cleanErr = rawErr && !rawErr.startsWith('<') ? rawErr : `Request failed (${res.status})`;
    throw new ApiError(cleanErr, res.status);
  }
  return data as T;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
