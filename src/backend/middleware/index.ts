/**
 * Backend Middleware — barrel export
 */
export { getAuthenticatedUser, type AuthenticatedUser } from "./auth";
export { checkRateLimit } from "./rate-limiter";
