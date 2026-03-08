/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Email Service (Nodemailer + Gmail SMTP)
 * ─────────────────────────────────────────────────────────
 * Sends alert, report, and maintenance reminder emails
 * from noreply.garuda@gmail.com via Gmail App Password.
 */

import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/backend/config/env";
import logger from "@/backend/utils/logger";

// ── Singleton transporter ─────────────────────────────
let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // TLS
    auth: {
      user: env.EMAIL_FROM,
      pass: env.EMAIL_APP_PASSWORD,
    },
  });

  return _transporter;
}

// ── Types ─────────────────────────────────────────────
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export interface AlertEmailData {
  recipientName: string;
  recipientEmail: string;
  inverterId: string;
  inverterName: string;
  severity: "critical" | "warning";
  message: string;
  riskScore: number;
  timestamp: Date;
}

export interface WeeklyReportData {
  recipientName: string;
  recipientEmail: string;
  weekStart: string;
  weekEnd: string;
  totalGeneration: number;
  fleetEfficiency: number;
  activeAlerts: number;
  topPerformer: string;
  worstPerformer: string;
}

export interface MaintenanceReminderData {
  recipientName: string;
  recipientEmail: string;
  inverterId: string;
  inverterName: string;
  maintenanceType: string;
  scheduledDate: string;
  priority: "high" | "medium" | "low";
}

// ── Core send ─────────────────────────────────────────
export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Solar Intel" <${env.EMAIL_FROM}>`,
      to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    logger.info("Email sent", { to: opts.to, subject: opts.subject });
    return true;
  } catch (err) {
    logger.error("Email send failed", { error: (err as Error).message });
    return false;
  }
}

// ── Email Templates ───────────────────────────────────

/** Critical / Warning alert email */
export async function sendAlertEmail(data: AlertEmailData): Promise<boolean> {
  const isCritical = data.severity === "critical";
  const color = isCritical ? "#ef4444" : "#f59e0b";
  const icon  = isCritical ? "🔴" : "⚠️";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111116;border-radius:16px;border:1px solid #1e1e2a;overflow:hidden;">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1a0a2e,#0f0a1e);padding:32px 40px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <span style="font-size:28px;">☀️</span>
            <span style="font-size:22px;font-weight:700;color:#fff;">Solar <span style="color:#f59e0b;">Intel</span></span>
          </div>
          <p style="color:#6b6b8a;font-size:13px;margin:8px 0 0;">AI-Driven Solar Inverter Intelligence</p>
        </td></tr>

        <!-- Alert Banner -->
        <tr><td style="background:${color}18;border-left:4px solid ${color};padding:20px 40px;">
          <p style="margin:0;font-size:18px;font-weight:700;color:${color};">${icon} ${isCritical ? "Critical Alert" : "Warning Alert"}</p>
          <p style="margin:6px 0 0;color:#a0a0b8;font-size:14px;">${data.message}</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:32px 40px;">
          <p style="color:#e0e0f0;font-size:15px;margin:0 0 24px;">Hi ${data.recipientName},</p>
          <p style="color:#a0a0b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Your inverter <strong style="color:#e0e0f0;">${data.inverterName}</strong> (${data.inverterId}) 
            has triggered a <strong style="color:${color};">${data.severity.toUpperCase()}</strong> alert 
            and requires immediate attention.
          </p>

          <!-- Stats Grid -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td width="50%" style="padding:0 8px 0 0;">
                <div style="background:#1a1a24;border:1px solid #2a2a38;border-radius:10px;padding:16px;text-align:center;">
                  <p style="color:#6b6b8a;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Risk Score</p>
                  <p style="color:${color};font-size:28px;font-weight:700;font-family:monospace;margin:0;">${data.riskScore}</p>
                  <p style="color:#6b6b8a;font-size:11px;margin:4px 0 0;">out of 100</p>
                </div>
              </td>
              <td width="50%" style="padding:0 0 0 8px;">
                <div style="background:#1a1a24;border:1px solid #2a2a38;border-radius:10px;padding:16px;text-align:center;">
                  <p style="color:#6b6b8a;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px;">Severity</p>
                  <p style="color:${color};font-size:28px;font-weight:700;text-transform:uppercase;margin:0;">${data.severity}</p>
                  <p style="color:#6b6b8a;font-size:11px;margin:4px 0 0;">alert level</p>
                </div>
              </td>
            </tr>
          </table>

          <p style="color:#6b6b8a;font-size:12px;margin:0 0 24px;">
            Detected at: ${data.timestamp.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
          </p>

          <!-- CTA -->
          <a href="${env.NEXTAUTH_URL || "http://localhost:3000"}/ai-insights" 
             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
            View in Solar Intel →
          </a>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 40px;border-top:1px solid #1e1e2a;text-align:center;">
          <p style="color:#3a3a50;font-size:12px;margin:0;">Solar Intel · AI-Driven Solar Inverter Intelligence</p>
          <p style="color:#3a3a50;font-size:11px;margin:6px 0 0;">You received this because alert notifications are enabled.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to: data.recipientEmail,
    subject: `${icon} ${isCritical ? "[CRITICAL]" : "[WARNING]"} ${data.inverterName} — Risk Score ${data.riskScore}`,
    html,
    text: `${data.severity.toUpperCase()} Alert: ${data.inverterName} (${data.inverterId})\n${data.message}\nRisk Score: ${data.riskScore}/100`,
  });
}

/** Weekly performance report email */
export async function sendWeeklyReport(data: WeeklyReportData): Promise<boolean> {
  const effColor = data.fleetEfficiency >= 90 ? "#22c55e" : data.fleetEfficiency >= 75 ? "#f59e0b" : "#ef4444";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111116;border-radius:16px;border:1px solid #1e1e2a;overflow:hidden;">

        <tr><td style="background:linear-gradient(135deg,#1a0a2e,#0f0a1e);padding:32px 40px;text-align:center;">
          <span style="font-size:22px;font-weight:700;color:#fff;">☀️ Solar <span style="color:#f59e0b;">Intel</span></span>
          <p style="color:#6b6b8a;font-size:13px;margin:8px 0 0;">Weekly Performance Report</p>
          <p style="color:#4a4a6a;font-size:12px;margin:4px 0 0;">${data.weekStart} — ${data.weekEnd}</p>
        </td></tr>

        <tr><td style="padding:32px 40px;">
          <p style="color:#e0e0f0;font-size:15px;margin:0 0 24px;">Hi ${data.recipientName}, here's your weekly summary 📊</p>

          <table width="100%" cellpadding="0" cellspacing="8" style="margin-bottom:28px;">
            <tr>
              <td width="33%" style="padding:4px;">
                <div style="background:#1a1a24;border:1px solid #2a2a38;border-radius:10px;padding:16px;text-align:center;">
                  <p style="color:#6b6b8a;font-size:11px;text-transform:uppercase;margin:0 0 6px;">Total Generation</p>
                  <p style="color:#f59e0b;font-size:22px;font-weight:700;font-family:monospace;margin:0;">${data.totalGeneration.toLocaleString()}</p>
                  <p style="color:#6b6b8a;font-size:11px;margin:4px 0 0;">kWh</p>
                </div>
              </td>
              <td width="33%" style="padding:4px;">
                <div style="background:#1a1a24;border:1px solid #2a2a38;border-radius:10px;padding:16px;text-align:center;">
                  <p style="color:#6b6b8a;font-size:11px;text-transform:uppercase;margin:0 0 6px;">Fleet Efficiency</p>
                  <p style="color:${effColor};font-size:22px;font-weight:700;font-family:monospace;margin:0;">${data.fleetEfficiency}%</p>
                  <p style="color:#6b6b8a;font-size:11px;margin:4px 0 0;">performance ratio</p>
                </div>
              </td>
              <td width="33%" style="padding:4px;">
                <div style="background:#1a1a24;border:1px solid #2a2a38;border-radius:10px;padding:16px;text-align:center;">
                  <p style="color:#6b6b8a;font-size:11px;text-transform:uppercase;margin:0 0 6px;">Active Alerts</p>
                  <p style="color:${data.activeAlerts > 0 ? "#ef4444" : "#22c55e"};font-size:22px;font-weight:700;font-family:monospace;margin:0;">${data.activeAlerts}</p>
                  <p style="color:#6b6b8a;font-size:11px;margin:4px 0 0;">unresolved</p>
                </div>
              </td>
            </tr>
          </table>

          <div style="background:#1a1a24;border:1px solid #2a2a38;border-radius:10px;padding:16px;margin-bottom:24px;">
            <p style="color:#6b6b8a;font-size:12px;margin:0 0 8px;">🏆 Top Performer</p>
            <p style="color:#22c55e;font-size:14px;font-weight:600;margin:0;">${data.topPerformer}</p>
          </div>
          <div style="background:#1a1a24;border:1px solid #2a2a38;border-radius:10px;padding:16px;margin-bottom:24px;">
            <p style="color:#6b6b8a;font-size:12px;margin:0 0 8px;">⚠️ Needs Attention</p>
            <p style="color:#f59e0b;font-size:14px;font-weight:600;margin:0;">${data.worstPerformer}</p>
          </div>

          <a href="${env.NEXTAUTH_URL || "http://localhost:3000"}/analytics"
             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
            View Full Analytics →
          </a>
        </td></tr>

        <tr><td style="padding:20px 40px;border-top:1px solid #1e1e2a;text-align:center;">
          <p style="color:#3a3a50;font-size:12px;margin:0;">Solar Intel · Weekly Report</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to: data.recipientEmail,
    subject: `📊 Weekly Solar Report: ${data.totalGeneration.toLocaleString()} kWh Generated (${data.weekStart})`,
    html,
  });
}

/** Maintenance reminder email */
export async function sendMaintenanceReminder(data: MaintenanceReminderData): Promise<boolean> {
  const priorityColor = data.priority === "high" ? "#ef4444" : data.priority === "medium" ? "#f59e0b" : "#22c55e";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111116;border-radius:16px;border:1px solid #1e1e2a;overflow:hidden;">

        <tr><td style="background:linear-gradient(135deg,#1a0a2e,#0f0a1e);padding:32px 40px;text-align:center;">
          <span style="font-size:22px;font-weight:700;color:#fff;">☀️ Solar <span style="color:#f59e0b;">Intel</span></span>
          <p style="color:#6b6b8a;font-size:13px;margin:8px 0 0;">Maintenance Reminder</p>
        </td></tr>

        <tr><td style="padding:32px 40px;">
          <p style="color:#e0e0f0;font-size:15px;margin:0 0 24px;">Hi ${data.recipientName},</p>
          <p style="color:#a0a0b8;font-size:14px;line-height:1.6;margin:0 0 24px;">
            A scheduled maintenance task is coming up for 
            <strong style="color:#e0e0f0;">${data.inverterName}</strong> (${data.inverterId}).
          </p>

          <div style="background:#1a1a24;border:1px solid #2a2a38;border-radius:10px;padding:20px;margin-bottom:24px;">
            <table width="100%">
              <tr>
                <td style="padding:6px 0;"><span style="color:#6b6b8a;font-size:13px;">Task</span></td>
                <td style="padding:6px 0;text-align:right;"><span style="color:#e0e0f0;font-size:13px;font-weight:600;">${data.maintenanceType}</span></td>
              </tr>
              <tr>
                <td style="padding:6px 0;"><span style="color:#6b6b8a;font-size:13px;">Scheduled Date</span></td>
                <td style="padding:6px 0;text-align:right;"><span style="color:#f59e0b;font-size:13px;font-weight:600;">${data.scheduledDate}</span></td>
              </tr>
              <tr>
                <td style="padding:6px 0;"><span style="color:#6b6b8a;font-size:13px;">Priority</span></td>
                <td style="padding:6px 0;text-align:right;"><span style="color:${priorityColor};font-size:13px;font-weight:700;text-transform:uppercase;">${data.priority}</span></td>
              </tr>
            </table>
          </div>

          <a href="${env.NEXTAUTH_URL || "http://localhost:3000"}/maintenance"
             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
            View Maintenance Schedule →
          </a>
        </td></tr>

        <tr><td style="padding:20px 40px;border-top:1px solid #1e1e2a;text-align:center;">
          <p style="color:#3a3a50;font-size:12px;margin:0;">Solar Intel · Maintenance Alerts</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to: data.recipientEmail,
    subject: `🔧 Maintenance Reminder: ${data.maintenanceType} — ${data.inverterName} on ${data.scheduledDate}`,
    html,
  });
}
