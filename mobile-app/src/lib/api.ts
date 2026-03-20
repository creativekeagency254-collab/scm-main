import { API_BASE } from "./supabase";

type ApiOpts = {
  token: string;
};

type JsonRequestInit = Omit<RequestInit, "body" | "headers"> & {
  body?: Record<string, unknown> | string;
  headers?: Record<string, string>;
};

async function apiFetch<T>(
  path: string,
  init: JsonRequestInit,
  opts: ApiOpts
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${opts.token}`
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {})
    },
    body: typeof init.body === "string" ? init.body : JSON.stringify(init.body || {})
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data?.error || data?.message || data?.detail || "Request failed.";
    throw new Error(String(message));
  }
  return data as T;
}

export async function startManualDeposit(payload: {
  token: string;
  userId: string;
  email: string;
  tier: number;
  amount: number;
  method?: string;
  phone?: string;
  name?: string;
}) {
  return apiFetch<{
    ok?: boolean;
    manual?: boolean;
    reference?: string;
    authorization_url?: string;
  }>(
    "/api/v1/deposit/create",
    {
      method: "POST",
      body: {
        amount: payload.amount,
        user_id: payload.userId,
        email: payload.email,
        tier: payload.tier,
        method: payload.method || "M-Pesa",
        payment_mode: "manual",
        phone: payload.phone || "",
        name: payload.name || ""
      }
    },
    { token: payload.token }
  );
}
