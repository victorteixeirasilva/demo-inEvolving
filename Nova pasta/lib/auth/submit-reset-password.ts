/**
 * Fase 2: PUT `${API_BASE_URL}/api/authentication/forgot/update`
 * Body: { idToken: tokenDaUrl, newPassword }
 */
export async function submitResetPasswordRequest(
  idToken: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const res = await fetch("/api/mock/reset-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, newPassword }),
    });
    const data = (await res.json()) as { ok?: boolean; message?: string };
    if (res.ok && data.ok === true) {
      return { ok: true };
    }
    return {
      ok: false,
      message: data.message ?? "Não foi possível redefinir a senha. Tente novamente.",
    };
  } catch {
    return { ok: false, message: "Falha de conexão. Verifique sua internet e tente de novo." };
  }
}
