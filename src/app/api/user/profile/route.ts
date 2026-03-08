/**
 * GET   /api/user/profile — Get authenticated user profile
 * PATCH /api/user/profile — Update user preferences
 */
import { NextRequest } from "next/server";
import {
  getUserProfile, updateUserProfile,
  getAuthenticatedUser,
  apiSuccess, apiError, logger,
} from "@/backend";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const data = await getUserProfile(auth.user.id);
    return apiSuccess(data);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "NOT_FOUND") return apiError("User not found", 404);
    logger.error("GET /api/user/profile failed", { error: msg });
    return apiError("Internal server error", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const body = await req.json();
    const data = await updateUserProfile(auth.user.id, body);
    return apiSuccess(data);
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "NOT_FOUND") return apiError("User not found", 404);
    if (msg === "NO_VALID_FIELDS") return apiError("No valid fields to update", 400);
    logger.error("PATCH /api/user/profile failed", { error: msg });
    return apiError("Internal server error", 500);
  }
}
