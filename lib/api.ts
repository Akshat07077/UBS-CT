"use client";

export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (res.status === 204) {
    if (!res.ok) throw new Error("Request failed");
    return undefined as T;
  }
  const text = await res.text();
  let data: { error?: string } | null = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      if (!res.ok) throw new Error("Request failed");
      return text as T;
    }
  }
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data as T;
}
