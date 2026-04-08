import type { LoginErrorCode, LoginResult } from "@/lib/auth/login-result";

/**
 * Login via rota mock. Na fase 2: trocar por `apiClient.post` em `API_BASE_URL/api/authentication/login`
 * e mapear corpo/HTTP conforme contrato real.
 */
export async function submitLoginRequest(email: string, password: string): Promise<LoginResult> {
  try {
    const res = await fetch("/api/mock/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    let data: { ok?: boolean; token?: string; code?: LoginErrorCode } = {};
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return { ok: false, code: "INVALID_CREDENTIALS" };
    }

    if (data.ok === true && typeof data.token === "string") {
      return { ok: true, token: data.token };
    }
    if (data.ok === false && data.code) {
      return { ok: false, code: data.code };
    }
    return { ok: false, code: "INVALID_CREDENTIALS" };
  } catch {
    return { ok: false, code: "INVALID_CREDENTIALS" };
  }
}
