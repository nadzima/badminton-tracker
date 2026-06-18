const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL!;

async function request<T>(
  method: "GET" | "POST",
  action: string,
  params: Record<string, unknown> = {}
): Promise<T> {
  let res: Response;

  if (method === "GET") {
    const qs = new URLSearchParams({ action });
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) qs.set(k, String(v));
    });
    res = await fetch(`${APPS_SCRIPT_URL}?${qs}`, { redirect: "follow" });
  } else {
    res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      redirect: "follow",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...params }),
    });
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Invalid Apps Script response: ${text.slice(0, 200)}`);
  }

  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    (data as Record<string, unknown>).error
  ) {
    throw new Error(String((data as Record<string, unknown>).error));
  }

  return data as T;
}

export const appscript = {
  get: <T>(action: string, params?: Record<string, string>) =>
    request<T>("GET", action, params),
  post: <T>(action: string, params?: Record<string, unknown>) =>
    request<T>("POST", action, params),
};
