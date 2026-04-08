/** Códigos de erro de login alinhados à API / UX (fase 2 mapeia `message` → código). */
export type LoginErrorCode = "EMAIL_UNVERIFIED" | "INVALID_CREDENTIALS" | "PLAN_EXPIRED";

export type LoginResult =
  | { ok: true; token: string }
  | { ok: false; code: LoginErrorCode };
