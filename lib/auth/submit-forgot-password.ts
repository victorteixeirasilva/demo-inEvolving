/**
 * Fase 2: `POST ${API_BASE_URL}/api/authentication/forgot` com body `{ userEmail }`.
 */
export async function submitForgotPasswordRequest(userEmail: string): Promise<{ ok: boolean }> {
  try {
    const res = await fetch("/api/mock/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail }),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { ok?: boolean };
    return { ok: data.ok === true };
  } catch {
    return { ok: false };
  }
}
