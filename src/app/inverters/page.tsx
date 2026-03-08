/**
 * ─────────────────────────────────────────────────────────
 * Solar Intel — Inverter Management (/inverters)
 * ─────────────────────────────────────────────────────────
 * Full CRUD: list, add, edit, delete inverters.
 * Admin can do everything; regular users can edit their own.
 */

"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { pageTransition, staggerContainer, fadeUp } from "@/lib/motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WeatherCard } from "@/components/ui/weather-card";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/i18n/context";
import { fetchAllPlants, importFile } from "@/lib/api-client";
import { TranslatedText } from "@/components/ui/translated-text";
import {
  Plus, Pencil, Trash2, Zap, AlertTriangle, CheckCircle2,
  XCircle, Search, RefreshCw, ChevronUp, ChevronDown,
  ArrowLeft, Factory, Upload, FileSpreadsheet,
} from "lucide-react";
import type { Inverter, Plant } from "@/types";

// ── API helpers ───────────────────────────────────────────

async function fetchInverters(): Promise<Inverter[]> {
  const res = await fetch("/api/inverters");
  if (!res.ok) throw new Error("Failed to fetch inverters");
  const json = await res.json();
  return json.data;
}

async function apiCreateInverter(body: Partial<Inverter>) {
  const res = await fetch("/api/inverters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Create failed");
  return json.data;
}

async function apiUpdateInverter(id: string, body: Partial<Inverter>) {
  const res = await fetch(`/api/inverters/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Update failed");
  return json.data;
}

async function apiDeleteInverter(id: string) {
  const res = await fetch(`/api/inverters/${id}`, { method: "DELETE" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Delete failed");
  return json.data;
}

// ── Status helpers ────────────────────────────────────────

const statusColors: Record<string, string> = {
  healthy:  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  warning:  "bg-amber-500/15 text-amber-400 border-amber-500/30",
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "healthy")  return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "warning")  return <AlertTriangle className="h-3.5 w-3.5" />;
  return <XCircle className="h-3.5 w-3.5" />;
};

// ── Blank form ────────────────────────────────────────────

function blankForm(): Partial<Inverter> {
  return {
    id: "", plantId: "", name: "", location: "", status: "healthy",
    model: "", capacity: 0, installDate: new Date().toISOString().split("T")[0],
    firmware: "", performanceRatio: 0, efficiency: 0,
    riskScore: 0, uptime: 100,
    inverterPower: 0, inverterPv1Power: 0, inverterPv1Voltage: 0, inverterPv1Current: 0,
    inverterPv2Power: 0, inverterPv2Voltage: 0, inverterPv2Current: 0,
    inverterKwhToday: 0, inverterKwhTotal: 0, inverterTemp: 0,
    inverterOpState: 0, inverterAlarmCode: 0, inverterLimitPercent: 0,
    ambientTemp: 0, meterActivePower: 0,
  };
}

// ── Field input ───────────────────────────────────────────

function Field({
  label, name, type = "text", value, required, options, onChange,
}: {
  label: string; name: string; type?: string;
  value: string | number; required?: boolean;
  options?: string[]; onChange: (name: string, value: string | number) => void;
}) {
  const base =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {options ? (
        <select
          title={label}
          className={cn(base, "bg-background")}
          value={value as string}
          onChange={(e) => onChange(name, e.target.value)}
        >
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className={base}
          value={value}
          placeholder={label}
          onChange={(e) =>
            onChange(name, type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)
          }
        />
      )}
    </div>
  );
}

// ── Add / Edit dialog ─────────────────────────────────────

function InverterFormDialog({
  mode, inverter, open, onOpenChange, onSave, isSaving, error, plants,
}: {
  mode: "add" | "edit";
  inverter: Partial<Inverter>;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: Partial<Inverter>) => void;
  isSaving: boolean;
  error: string | null;
  plants?: Plant[];
}) {
  const [form, setForm] = useState<Partial<Inverter>>(inverter);
  const setField = (name: string, value: string | number) =>
    setForm((f) => ({ ...f, [name]: value }));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-background p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-foreground">
              {mode === "add" ? "Add New Inverter" : `Edit — ${inverter.id}`}
            </Dialog.Title>
            <Dialog.Close asChild>
              <button title="Close" className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground">
                <XCircle className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {mode === "add" && (
              <Field label="Inverter ID" name="id" value={form.id ?? ""} required
                onChange={(_, v) => setForm((f) => ({ ...f, id: v as string }))} />
            )}
            {mode === "add" && plants && plants.length > 0 ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Plant <span className="text-red-400">*</span>
                </label>
                <select
                  title="Select Plant"
                  className="w-full rounded-lg border border-white/10 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  value={form.plantId ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, plantId: e.target.value }))}
                >
                  <option value="">— Select a plant —</option>
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                  ))}
                </select>
              </div>
            ) : mode === "add" ? (
              <Field label="Plant ID" name="plantId" value={form.plantId ?? ""} required onChange={setField} />
            ) : null}
            <Field label="Name"        name="name"     value={form.name ?? ""}     required onChange={setField} />
            <Field label="Location"    name="location" value={form.location ?? ""} required onChange={setField} />
            <Field label="Status"      name="status"   value={form.status ?? "healthy"}
              options={["healthy", "warning", "critical"]} onChange={setField} />
            <Field label="Model"       name="model"    value={form.model ?? ""}    required onChange={setField} />
            <Field label="Capacity (kW)"    name="capacity"    type="number" value={form.capacity ?? 0}    required onChange={setField} />
            <Field label="Install Date"     name="installDate" type="date"   value={form.installDate ?? ""} required onChange={setField} />
            <Field label="Firmware"         name="firmware"    value={form.firmware ?? ""}   onChange={setField} />
            <Field label="Inverter Power (W)"     name="inverterPower"     type="number" value={form.inverterPower ?? 0}     onChange={setField} />
            <Field label="PV1 Power (W)"          name="inverterPv1Power"  type="number" value={form.inverterPv1Power ?? 0}  onChange={setField} />
            <Field label="PV1 Voltage (V)"        name="inverterPv1Voltage" type="number" value={form.inverterPv1Voltage ?? 0} onChange={setField} />
            <Field label="PV1 Current (A)"        name="inverterPv1Current" type="number" value={form.inverterPv1Current ?? 0} onChange={setField} />
            <Field label="PV2 Power (W)"          name="inverterPv2Power"  type="number" value={form.inverterPv2Power ?? 0}  onChange={setField} />
            <Field label="PV2 Voltage (V)"        name="inverterPv2Voltage" type="number" value={form.inverterPv2Voltage ?? 0} onChange={setField} />
            <Field label="PV2 Current (A)"        name="inverterPv2Current" type="number" value={form.inverterPv2Current ?? 0} onChange={setField} />
            <Field label="kWh Today"               name="inverterKwhToday"  type="number" value={form.inverterKwhToday ?? 0}  onChange={setField} />
            <Field label="kWh Total"               name="inverterKwhTotal"  type="number" value={form.inverterKwhTotal ?? 0}  onChange={setField} />
            <Field label="Temperature (°C)"        name="inverterTemp"      type="number" value={form.inverterTemp ?? 0}      onChange={setField} />
            <Field label="Op State"                name="inverterOpState"   type="number" value={form.inverterOpState ?? 0}   onChange={setField} />
            <Field label="Alarm Code"              name="inverterAlarmCode" type="number" value={form.inverterAlarmCode ?? 0} onChange={setField} />
            <Field label="Limit %"                 name="inverterLimitPercent" type="number" value={form.inverterLimitPercent ?? 0} onChange={setField} />
            <Field label="Ambient Temp (°C)"       name="ambientTemp"       type="number" value={form.ambientTemp ?? 0}       onChange={setField} />
            <Field label="Meter Active Power (kW)" name="meterActivePower"  type="number" value={form.meterActivePower ?? 0}  onChange={setField} />
            <Field label="Performance Ratio (%)" name="performanceRatio" type="number" value={form.performanceRatio ?? 0} onChange={setField} />
            <Field label="Efficiency (%)"  name="efficiency"  type="number" value={form.efficiency ?? 0}  onChange={setField} />
            <Field label="Uptime (%)"      name="uptime"      type="number" value={form.uptime ?? 100}     onChange={setField} />
            <Field label="Risk Score (0–100)" name="riskScore" type="number" value={form.riskScore ?? 0}   onChange={setField} />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline" disabled={isSaving}>Cancel</Button>
            </Dialog.Close>
            <Button disabled={isSaving} onClick={() => onSave(form)} className="gap-2">
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> :
               mode === "add" ? <Plus className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {isSaving ? "Saving…" : mode === "add" ? "Add Inverter" : "Save Changes"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Delete confirm dialog ─────────────────────────────────

function DeleteDialog({
  inverterId, open, onOpenChange, onConfirm, isDeleting, error,
}: {
  inverterId: string; open: boolean; onOpenChange: (v: boolean) => void;
  onConfirm: () => void; isDeleting: boolean; error: string | null;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-background p-6 shadow-2xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <Dialog.Title className="text-lg font-semibold">Delete Inverter</Dialog.Title>
          </div>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">{inverterId}</span>?
            This will also remove all its telemetry records.{" "}
            <span className="text-red-400">This cannot be undone.</span>
          </p>
          {error && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline" disabled={isDeleting}>Cancel</Button>
            </Dialog.Close>
            <Button
              disabled={isDeleting}
              onClick={onConfirm}
              className="gap-2 bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Sort helper ───────────────────────────────────────────

type SortKey = "id" | "name" | "location" | "status" | "capacity" | "powerOutput" | "riskScore";

function sortInverters(list: Inverter[], key: SortKey, dir: "asc" | "desc") {
  return [...list].sort((a, b) => {
    const av = a[key as keyof Inverter] as string | number;
    const bv = b[key as keyof Inverter] as string | number;
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return dir === "asc" ? cmp : -cmp;
  });
}

// ── Main page ─────────────────────────────────────────────

export default function InvertersPage() {
  const qc = useQueryClient();
  const { t } = useLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plantIdFilter = searchParams.get("plantId");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  const { data: inverters = [], isLoading } = useQuery({
    queryKey: ["inverters"],
    queryFn: fetchInverters,
    refetchInterval: 30_000,
  });

  // Fetch plants for breadcrumb plant name lookup + Add Inverter plant dropdown
  const { data: plants = [] } = useQuery<Plant[]>({
    queryKey: ["plants"],
    queryFn: fetchAllPlants,
  });

  const activePlant = plantIdFilter ? plants.find((p) => p.id === plantIdFilter) : null;

  // ── Import handler
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const result = await importFile(file, "inverter");
      setImportResult(
        `Success! Imported ${result.invertersCreated} inverter(s).` +
        (result.plantsCreated > 0 ? ` Also created ${result.plantsCreated} plant(s).` : "") +
        (result.warnings.length > 0 ? ` Warnings: ${result.warnings.join(", ")}` : "") +
        (result.errors.length > 0 ? ` Errors: ${result.errors.join(", ")}` : "")
      );
      qc.invalidateQueries({ queryKey: ["inverters"] });
      qc.invalidateQueries({ queryKey: ["plants"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setImportResult(`Error: ${msg}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Filter inverters by plantId when query param is present
  const plantFiltered = plantIdFilter
    ? inverters.filter((inv) => inv.plantId === plantIdFilter)
    : inverters;

  // ── Dialog state
  const [addOpen,    setAddOpen]    = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected,   setSelected]   = useState<Inverter | null>(null);
  const [formError,  setFormError]  = useState<string | null>(null);

  // ── Search / sort
  const [search,   setSearch]   = useState("");
  const [sortKey,  setSortKey]  = useState<SortKey>("id");
  const [sortDir,  setSortDir]  = useState<"asc" | "desc">("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = sortInverters(
    plantFiltered.filter(
      (inv) =>
        inv.id.toLowerCase().includes(search.toLowerCase()) ||
        inv.name.toLowerCase().includes(search.toLowerCase()) ||
        inv.location.toLowerCase().includes(search.toLowerCase())
    ),
    sortKey,
    sortDir
  );

  // ── Mutations
  const createMutation = useMutation({
    mutationFn: (data: Partial<Inverter>) => apiCreateInverter({ ...data, inverterId: data.id } as Partial<Inverter> & { inverterId?: string }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inverters"] }); qc.invalidateQueries({ queryKey: ["plants"] }); setAddOpen(false); setFormError(null); },
    onError:   (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Inverter> }) => apiUpdateInverter(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inverters"] }); setEditOpen(false);  setFormError(null); },
    onError:   (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDeleteInverter(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inverters"] }); setDeleteOpen(false); setFormError(null); },
    onError:   (err: Error) => setFormError(err.message),
  });

  // ── Summary stats
  const healthy  = plantFiltered.filter((i) => i.status === "healthy").length;
  const warning  = plantFiltered.filter((i) => i.status === "warning").length;
  const critical = plantFiltered.filter((i) => i.status === "critical").length;
  const totalKW  = plantFiltered.reduce((s, i) => s + (i.powerOutput || 0), 0);

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey === col ? (
      sortDir === "asc" ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
    ) : (
      <span className="ml-1 inline-block h-3 w-3" />
    );

  return (
    <motion.div {...pageTransition} className="mx-auto max-w-[1440px] space-y-6">
      {/* Breadcrumb for plant filter */}
      {plantIdFilter && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm">
          <a href="/plants" title="Back to Solar Plants" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <Factory className="h-4 w-4" />
            <span><TranslatedText text="Solar Plants" /></span>
          </a>
          <span className="text-muted-foreground/50">/</span>
          <span className="font-medium text-purple-400">{activePlant?.name || plantIdFilter}</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="text-foreground"><TranslatedText text="Inverters" /></span>
          <button
            title="Show all inverters"
            onClick={() => router.push("/inverters")}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <XCircle className="h-3 w-3" />
            <TranslatedText text="Show All Inverters" />
          </button>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {plantIdFilter && activePlant ? activePlant.name : t("inverters.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {plantIdFilter
              ? `${plantFiltered.length} inverter(s) in this plant`
              : t("inverters.subtitle")}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          {/* Weather for first inverter in fleet */}
          {plantFiltered.length > 0 && (
            <WeatherCard inverterId={plantFiltered[0].id} compact className="sm:w-auto" />
          )}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImport}
              title="Upload CSV or Excel file"
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="gap-2"
            >
              {importing ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <TranslatedText text="Import CSV / Excel" />
            </Button>
            <Button
              onClick={() => { setFormError(null); setAddOpen(true); }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t("inverters.addInverter")}
            </Button>
          </div>
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border p-3 text-sm ${
            importResult.startsWith("Error")
              ? "border-red-500/30 bg-red-500/10 text-red-400"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
          }`}
        >
          <FileSpreadsheet className="inline h-4 w-4 mr-2" />
          {importResult}
        </motion.div>
      )}

      {/* Summary cards */}
      <motion.div
        variants={staggerContainer} initial="hidden" animate="visible"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {[
          { label: t("inverters.total"),  value: plantFiltered.length, icon: Zap,          color: "text-blue-400"    },
          { label: t("common.healthy"),   value: healthy,           icon: CheckCircle2, color: "text-emerald-400" },
          { label: t("common.warning"),   value: warning,           icon: AlertTriangle, color: "text-amber-400"  },
          { label: t("common.critical"),  value: critical,          icon: XCircle,      color: "text-red-400"     },
        ].map((s) => (
          <motion.div key={s.label} variants={fadeUp}>
            <Card className="border-white/5 bg-card/50">
              <CardContent className="flex items-center gap-3 p-4">
                <s.icon className={cn("h-8 w-8 shrink-0", s.color)} />
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Table card */}
      <Card className="border-white/5 bg-card/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base font-semibold">
            {plantIdFilter && activePlant ? activePlant.name + " — Inverters" : t("inverters.allInverters")}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              — {totalKW.toFixed(1)} kW total output
            </span>
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className="h-8 w-52 rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                <Zap className="h-10 w-10 opacity-30" />
                <p className="text-sm">{t("inverters.noResults")}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs text-muted-foreground">
                    {(
                      [
                        { key: "id",          label: "ID"       },
                        { key: "name",        label: "Name"     },
                        { key: "location",    label: "Location" },
                        { key: "status",      label: "Status"   },
                        { key: "capacity",    label: "Capacity" },
                        { key: "powerOutput", label: "Power"    },
                        { key: "riskScore",   label: "Risk"     },
                      ] as { key: SortKey; label: string }[]
                    ).map(({ key, label }) => (
                      <th
                        key={key}
                        className="cursor-pointer select-none px-4 py-3 font-medium hover:text-foreground"
                        onClick={() => handleSort(key)}
                      >
                        <span className="flex items-center">
                          {label}
                          <SortIcon col={key} />
                        </span>
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium text-left">Reason</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <AnimatePresence mode="popLayout">
                  <tbody>
                    {filtered.map((inv, idx) => (
                      <motion.tr
                        key={inv.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{inv.id}</td>
                        <td className="px-4 py-3 font-medium text-foreground">{inv.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{inv.location}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                            statusColors[inv.status]
                          )}>
                            <StatusIcon status={inv.status} />
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{inv.capacity} kW</td>
                        <td className="px-4 py-3 text-foreground">{(inv.powerOutput ?? 0).toFixed(1)} kW</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "font-medium",
                            inv.riskScore >= 70 ? "text-red-400" :
                            inv.riskScore >= 40 ? "text-amber-400" : "text-emerald-400"
                          )}>
                            {inv.riskScore}
                          </span>
                        </td>
                        <td className="max-w-[220px] px-4 py-3">
                          <span className={cn(
                            "text-xs leading-tight",
                            inv.status === "critical" ? "text-red-300" :
                            inv.status === "warning" ? "text-amber-300" : "text-muted-foreground"
                          )}>
                            {inv.statusReason || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              title="Edit"
                              onClick={() => { setSelected(inv); setFormError(null); setEditOpen(true); }}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              title="Delete"
                              onClick={() => { setSelected(inv); setFormError(null); setDeleteOpen(true); }}
                              className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/20 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </AnimatePresence>
              </table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Add dialog ── */}
      <InverterFormDialog
        key={addOpen ? "add-open" : "add-closed"}
        mode="add"
        inverter={blankForm()}
        open={addOpen}
        onOpenChange={(v) => { setAddOpen(v); if (!v) setFormError(null); }}
        onSave={(data) => createMutation.mutate(data)}
        isSaving={createMutation.isPending}
        error={formError}
        plants={plants}
      />

      {/* ── Edit dialog ── */}
      {selected && (
        <InverterFormDialog
          key={`edit-${selected.id}`}
          mode="edit"
          inverter={selected}
          open={editOpen}
          onOpenChange={(v) => { setEditOpen(v); if (!v) setFormError(null); }}
          onSave={(data) => updateMutation.mutate({ id: selected.id, data })}
          isSaving={updateMutation.isPending}
          error={formError}
        />
      )}

      {/* ── Delete dialog ── */}
      {selected && (
        <DeleteDialog
          inverterId={selected.id}
          open={deleteOpen}
          onOpenChange={(v) => { setDeleteOpen(v); if (!v) setFormError(null); }}
          onConfirm={() => deleteMutation.mutate(selected.id)}
          isDeleting={deleteMutation.isPending}
          error={formError}
        />
      )}
    </motion.div>
  );
}