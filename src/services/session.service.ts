import { api } from "../lib/api";

/**
 * One server-side login session (a "device").
 *
 * The backend stores these in `UserSessions` and puts the id in the JWT as
 * `sid`. Revoking a session makes every later request from that device fail
 * with 401, which the shared axios interceptor turns into a logout.
 */
export interface UserSession {
  sessionUniqueId: string;
  platform: string | null;
  deviceName: string | null;
  deviceModel: string | null;
  appVersion: string | null;
  locale: string | null;
  ipAddress: string | null;
  lastSeenAt: string | null;
  createdAt: string | null;
  expiresAt: string | null;
  /** True for the browser/tab making this request. */
  current: boolean;
}

export interface SessionsPayload {
  currentSessionUniqueId: string | null;
  sessions: UserSession[];
}

/** GET /api/user/sessions — every active device for the signed-in user. */
export const listSessions = () =>
  api.get<{ message: string; data: SessionsPayload }>("/user/sessions");

/** DELETE /api/user/sessions/:sessionUniqueId — sign one device out. */
export const revokeSession = (sessionUniqueId: string) =>
  api.delete<{ message: string; data: { sessionUniqueId: string; current: boolean } }>(
    `/user/sessions/${encodeURIComponent(sessionUniqueId)}`,
  );

/**
 * DELETE /api/user/sessions — sign every other device out.
 * `keepCurrent` defaults to true on the server; pass false to sign this one out too.
 */
export const revokeOtherSessions = (keepCurrent = true) =>
  api.delete<{ message: string; data: { revokedCount: number; keptCurrent: boolean } }>(
    "/user/sessions",
    { params: { keepCurrent } },
  );
