/**
 * GET /api/seed — Seed the database with demo data
 * Only works in development mode.
 */
import { seedDatabase, apiSuccess, apiError, logger } from "@/backend";

export async function GET() {
  try {
    if (process.env.NODE_ENV === "production") {
      return apiError("Seed endpoint disabled in production", 403);
    }

    const result = await seedDatabase();

    logger.info("Database seeded", result);
    return apiSuccess({
      message: "Database seeded successfully",
      ...result,
    });
  } catch (err) {
    logger.error("GET /api/seed failed", { error: (err as Error).message });
    return apiError(`Seed failed: ${(err as Error).message}`, 500);
  }
}
