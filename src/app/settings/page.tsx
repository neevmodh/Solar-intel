/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Settings & Profile Page
 * ─────────────────────────────────────────────────────────
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { fadeUp, pageTransition } from "@/lib/motion";
import { fetchUserProfile } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Shield,
  CreditCard,
  Bell,
  Smartphone,
  MessageSquare,
  AlertTriangle,
  FileText,
  Wrench,
  Wifi,
  WifiOff,
  HardDrive,
  Battery,
  Gauge,
  Thermometer,
  Crown,
  CheckCircle2,
  IndianRupee,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TranslatedText } from "@/components/ui/translated-text";

const deviceTypeIcons: Record<string, React.ReactNode> = {
  inverter: <Gauge className="h-4 w-4" />,
  meter: <HardDrive className="h-4 w-4" />,
  battery: <Battery className="h-4 w-4" />,
  sensor: <Thermometer className="h-4 w-4" />,
};

const planColors: Record<string, string> = {
  basic: "text-zinc-400 border-zinc-500/20 bg-zinc-500/10",
  premium: "text-amber-400 border-amber-500/20 bg-amber-500/10",
  pro: "text-purple-400 border-purple-500/20 bg-purple-500/10",
};

export default function SettingsPage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile"],
    queryFn: fetchUserProfile,
    staleTime: 60_000,
  });

  if (isLoading || !profile) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const devices = profile.devices ?? [];
  const onlineDevices = devices.filter((d) => d.status === "online").length;
  const offlineDevices = devices.filter((d) => d.status === "offline").length;

  const notifSettings = [
    { key: "email", label: "Email Notifications", icon: Mail, enabled: profile.notifications.email },
    { key: "sms", label: "SMS Alerts", icon: MessageSquare, enabled: profile.notifications.sms },
    { key: "push", label: "Push Notifications", icon: Smartphone, enabled: profile.notifications.push },
    { key: "criticalAlerts", label: "Critical Alerts (24/7)", icon: AlertTriangle, enabled: profile.notifications.criticalAlerts },
    { key: "weeklyReport", label: "Weekly Report", icon: FileText, enabled: profile.notifications.weeklyReport },
    { key: "maintenanceReminders", label: "Maintenance Reminders", icon: Wrench, enabled: profile.notifications.maintenanceReminders },
  ];

  return (
    <motion.div
      variants={pageTransition}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6 p-6"
    >
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight"><TranslatedText text="Settings" /></h1>
        <p className="text-sm text-muted-foreground">
          <TranslatedText text="Account, devices, notifications & subscription management" />
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* ── Profile Card ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <Card className="border-border/40 bg-surface-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4 text-purple-400" />
                <TranslatedText text="Profile" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/10 text-xl font-bold text-purple-400">
                  {profile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <p className="text-base font-semibold">{profile.name}</p>
                  <p className="text-xs text-muted-foreground"><TranslatedText text={profile.role} /></p>
                </div>
              </div>

              <Separator className="opacity-30" />

              <div className="space-y-3">
                {[
                  { icon: Mail, label: "Email", value: profile.email },
                  { icon: Shield, label: "Account ID", value: profile.accountId },
                  { icon: User, label: "Role", value: profile.role },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground w-20"><TranslatedText text={item.label} /></span>
                    <span className="text-xs font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Subscription Card ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <Card className="border-border/40 bg-surface-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <CreditCard className="h-4 w-4 text-amber-400" />
                <TranslatedText text="Subscription" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                  <Crown className="h-6 w-6 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold capitalize">{profile.plan} <TranslatedText text="Plan" /></p>
                    <Badge variant="outline" className={cn("text-[10px]", planColors[profile.plan])}>
                      <TranslatedText text="Active" />
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground"><TranslatedText text="Full fleet management access" /></p>
                </div>
              </div>

              <Separator className="opacity-30" />

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <IndianRupee className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground w-20"><TranslatedText text="Monthly" /></span>
                  <span className="text-xs font-medium">₹{profile.planCost.toLocaleString()}/month</span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground w-20"><TranslatedText text="Renewal" /></span>
                  <span className="text-xs font-medium">{profile.nextRenewal}</span>
                </div>
              </div>

              {/* Plan features */}
              <div className="rounded-lg bg-surface-3 p-3 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <TranslatedText text="Included Features" />
                </p>
                {[
                  "AI-Powered Predictive Analytics",
                  "Real-time Anomaly Detection",
                  "48hr Solar Forecast",
                  "Priority Maintenance Scheduling",
                  "Carbon Impact Tracking",
                  "Unlimited Fleet Size",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-xs text-foreground/70">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <TranslatedText text={feature} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Notifications Card ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <Card className="border-border/40 bg-surface-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Bell className="h-4 w-4 text-blue-400" />
                <TranslatedText text="Notification Preferences" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {notifSettings.map((setting) => (
                  <div
                    key={setting.key}
                    className="flex items-center justify-between rounded-md bg-surface-3 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-3">
                      <setting.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium"><TranslatedText text={setting.label} /></span>
                    </div>
                    <div
                      className={cn(
                        "flex h-5 w-9 items-center rounded-full px-0.5 transition-colors",
                        setting.enabled ? "bg-emerald-500" : "bg-surface-4"
                      )}
                    >
                      <div
                        className={cn(
                          "h-4 w-4 rounded-full bg-white transition-transform",
                          setting.enabled ? "translate-x-4" : "translate-x-0"
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Devices Card ── */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <Card className="border-border/40 bg-surface-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <HardDrive className="h-4 w-4 text-emerald-400" />
                <TranslatedText text="Connected Devices" />
                <Badge variant="outline" className="ml-auto text-[10px] text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
                  {onlineDevices} <TranslatedText text="online" />
                </Badge>
                {offlineDevices > 0 && (
                  <Badge variant="outline" className="text-[10px] text-red-400 border-red-500/20 bg-red-500/10">
                    {offlineDevices} <TranslatedText text="offline" />
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {devices.map((device) => (
                  <div
                    key={device.id}
                    className={cn(
                      "flex items-center gap-3 rounded-md bg-surface-3 px-3 py-2.5",
                      device.status === "offline" && "opacity-60"
                    )}
                  >
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg",
                      device.status === "online" ? "bg-emerald-500/10" : "bg-red-500/10"
                    )}>
                      {deviceTypeIcons[device.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{device.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        FW: {device.firmware} · {device.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {device.status === "online" ? (
                        <Wifi className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <WifiOff className="h-3 w-3 text-red-400" />
                      )}
                      <span className={cn(
                        "text-[10px] font-medium",
                        device.status === "online" ? "text-emerald-400" : "text-red-400"
                      )}>
                        <TranslatedText text={device.status} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
