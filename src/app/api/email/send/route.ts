/**
 * POST /api/email/send — Send alert, weekly report, or maintenance reminder
 * Recipients default to the currently logged-in user's email + name.
 */
import { NextRequest } from "next/server";
import {
  sendAlertEmail, sendWeeklyReport, sendMaintenanceReminder, sendEmail,
  getAuthenticatedUser, apiSuccess, apiError, logger,
} from "@/backend";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    const body = await req.json();
    const { type } = body;

    // Auto-fill recipient from session if not explicitly provided
    const data = {
      ...body.data,
      recipientEmail: body.data?.recipientEmail || auth.user.email,
      recipientName:  body.data?.recipientName  || auth.user.name || "Operator",
    };

    let result = false;

    switch (type) {
      case "alert":
        result = await sendAlertEmail(data);
        break;
      case "weekly-report":
        result = await sendWeeklyReport(data);
        break;
      case "maintenance":
        result = await sendMaintenanceReminder(data);
        break;
      case "custom":
        result = await sendEmail(data);
        break;
      default:
        return apiError(`Unknown email type: ${type}. Use: alert|weekly-report|maintenance|custom`, 400);
    }

    if (!result) return apiError("Email failed to send — check EMAIL_APP_PASSWORD in .env.local", 500);
    return apiSuccess({ sent: true, type, sentTo: data.recipientEmail });
  } catch (err) {
    logger.error("POST /api/email/send failed", { error: (err as Error).message });
    return apiError("Internal server error", 500);
  }
}

/**
 * GET /api/email/send — Test: sends alert to the currently logged-in user
 */
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return apiError("Disabled in production", 403);

  try {
    const auth = await getAuthenticatedUser();
    if (auth.error) return auth.error;

    // Use logged-in user's email, or override with ?to=
    const url = new URL(req.url);
    const to   = url.searchParams.get("to")   || auth.user.email;
    const name = url.searchParams.get("name") || auth.user.name || "Operator";

    const result = await sendAlertEmail({
      recipientName:  name,
      recipientEmail: to,
      inverterId:    "INV-004",
      inverterName:  "Helios-3 Central",
      severity:      "critical",
      message:       "Inverter temperature critical (72°C). Immediate inspection required.",
      riskScore:     87,
      timestamp:     new Date(),
    });

    return apiSuccess({ sent: result, sentTo: to, type: "test-alert" });
  } catch (err) {
    return apiError((err as Error).message, 500);
  }
}
