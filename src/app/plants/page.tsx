"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { pageTransition } from "@/lib/motion";
import { fetchAllPlants, importFile } from "@/lib/api-client";
import { TranslatedText } from "@/components/ui/translated-text";
import { Button } from "@/components/ui/button";
import {
  Factory, MapPin, AlertTriangle, CheckCircle,
  Upload, FileSpreadsheet, ChevronRight, Activity,
  ShieldAlert, Zap, TrendingUp, Plus, XCircle, RefreshCw,
} from "lucide-react";
import type { Plant } from "@/types";

// ── API helper ────────────────────────────────────────────

async function apiCreatePlant(body: Record<string, unknown>) {
  const res = await fetch("/api/plants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to create plant");
  return json;
}

// ── Add Plant dialog ──────────────────────────────────────

function AddPlantDialog({
  open, onOpenChange, onSave, isSaving, error,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (data: Record<string, unknown>) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const [form, setForm] = useState({
    plantId: "", name: "", location: "", capacity: "",
    latitude: "", longitude: "", area: "", description: "",
  });

  const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-background p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Factory className="h-5 w-5 text-purple-400" />
              Add New Plant
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
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Plant ID <span className="text-red-400">*</span></label>
              <input className={inputClass} placeholder="e.g. Plant 4" value={form.plantId}
                onChange={(e) => setForm((f) => ({ ...f, plantId: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Name <span className="text-red-400">*</span></label>
              <input className={inputClass} placeholder="e.g. Tamil Nadu Solar Park" value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Location <span className="text-red-400">*</span></label>
              <input className={inputClass} placeholder="e.g. Tamil Nadu, India" value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Capacity (MW) <span className="text-red-400">*</span></label>
              <input type="number" step="0.01" className={inputClass} placeholder="e.g. 2.5" value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Latitude</label>
              <input type="number" step="0.0001" className={inputClass} placeholder="e.g. 11.1271" value={form.latitude}
                onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Longitude</label>
              <input type="number" step="0.0001" className={inputClass} placeholder="e.g. 78.6569" value={form.longitude}
                onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-foreground">Area (acres)</label>
              <input type="number" className={inputClass} placeholder="e.g. 15" value={form.area}
                onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <input className={inputClass} placeholder="Optional description" value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="outline" disabled={isSaving}>Cancel</Button>
            </Dialog.Close>
            <Button
              disabled={isSaving || !form.plantId || !form.name || !form.location || !form.capacity}
              onClick={() => onSave({
                plantId: form.plantId,
                name: form.name,
                location: form.location,
                capacity: parseFloat(form.capacity) || 0,
                latitude: parseFloat(form.latitude) || 0,
                longitude: parseFloat(form.longitude) || 0,
                area: parseFloat(form.area) || 0,
                description: form.description,
              })}
              className="gap-2"
            >
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isSaving ? "Creating…" : "Create Plant"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Plant Card ────────────────────────────────────────────

function PlantCard({ plant, onClick }: { plant: Plant; onClick: () => void }) {
  const statusColor =
    plant.riskLevel === "critical" ? "bg-red-500/20 text-red-400 border-red-500/30" :
    plant.riskLevel === "high" ? "bg-orange-500/20 text-orange-400 border-orange-500/30" :
    plant.riskLevel === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
    "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

  const statusIcon =
    plant.riskLevel === "critical" || plant.riskLevel === "high"
      ? <ShieldAlert className="h-4 w-4" />
      : plant.riskLevel === "medium"
        ? <AlertTriangle className="h-4 w-4" />
        : <CheckCircle className="h-4 w-4" />;

  const healthColor = (plant.healthScore || 0) >= 85 ? "text-emerald-400" : (plant.healthScore || 0) >= 70 ? "text-yellow-400" : "text-red-400";
  const perfColor = (plant.avgPerformance || 0) >= 85 ? "text-emerald-400" : (plant.avgPerformance || 0) >= 70 ? "text-yellow-400" : "text-red-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className="rounded-xl border border-border bg-card p-5 hover:border-purple-500/30 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-500/10 p-2">
            <Factory className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{plant.name}</h3>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {plant.location}
            </div>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusColor}`}>
          {statusIcon}
          {plant.riskLevel?.toUpperCase() || "LOW"}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground mb-1"><TranslatedText text="Capacity" /></div>
          <div className="text-lg font-bold text-foreground">{plant.capacity} <span className="text-xs font-normal text-muted-foreground">MW</span></div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground mb-1"><TranslatedText text="Inverters" /></div>
          <div className="flex items-center gap-2">
            <div className="text-lg font-bold text-foreground">{plant.inverterCount}</div>
            <Zap className="h-3.5 w-3.5 text-blue-400" />
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground mb-1"><TranslatedText text="Power Output" /></div>
          <div className="text-lg font-bold text-foreground">
            {(plant.totalPower || 0) >= 1000 
              ? <>{((plant.totalPower || 0) / 1000).toFixed(1)} <span className="text-xs font-normal text-muted-foreground">MW</span></>
              : <>{(plant.totalPower || 0).toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kW</span></>
            }
          </div>
        </div>
        <div className="rounded-lg bg-muted/50 p-3">
          <div className="text-xs text-muted-foreground mb-1"><TranslatedText text="Health Score" /></div>
          <div className={`text-lg font-bold ${healthColor}`}>{plant.healthScore || 0}<span className="text-xs font-normal text-muted-foreground">%</span></div>
        </div>
      </div>

      {/* Performance bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3" />
            <TranslatedText text="Performance Ratio" />
          </span>
          <span className={`text-xs font-bold ${perfColor}`}>{plant.avgPerformance || 0}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full rounded-full transition-all ${(plant.avgPerformance || 0) >= 85 ? "bg-emerald-500" : (plant.avgPerformance || 0) >= 70 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.min(plant.avgPerformance || 0, 100)}%` }} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {plant.inverterCount} <TranslatedText text="inverters connected" />
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-purple-400 group-hover:text-purple-300 transition-colors">
          <TranslatedText text="View Inverters" />
          <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </motion.div>
  );
}

export default function PlantsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [addPlantOpen, setAddPlantOpen] = useState(false);
  const [addPlantError, setAddPlantError] = useState<string | null>(null);

  const { data: plants = [], isLoading } = useQuery({
    queryKey: ["plants"],
    queryFn: fetchAllPlants,
    refetchInterval: 30000,
  });

  const createPlantMutation = useMutation({
    mutationFn: apiCreatePlant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setAddPlantOpen(false);
      setAddPlantError(null);
    },
    onError: (err: Error) => setAddPlantError(err.message),
  });

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResult(null);

    try {
      const result = await importFile(file);
      setImportResult(
        `Success! Created ${result.plantsCreated} plant(s) and ${result.invertersCreated} inverter(s).` +
        (result.warnings.length > 0 ? ` Warnings: ${result.warnings.join(", ")}` : "") +
        (result.errors.length > 0 ? ` Errors: ${result.errors.join(", ")}` : "")
      );
      queryClient.invalidateQueries({ queryKey: ["plants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setImportResult(`Error: ${msg}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const totalCapacity = plants.reduce((s, p) => s + p.capacity, 0);
  const totalInverters = plants.reduce((s, p) => s + p.inverterCount, 0);
  const avgHealth = plants.length
    ? Math.round(plants.reduce((s, p) => s + (p.healthScore || 0), 0) / plants.length)
    : 0;

  return (
    <AnimatePresence mode="wait">
      <motion.div key="plants" variants={pageTransition} initial="initial" animate="animate" exit="exit" className="mx-auto max-w-[1440px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <motion.h2 initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="text-xl font-bold tracking-tight text-foreground">
              <TranslatedText text="Solar Plants" />
            </motion.h2>
            <motion.p initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }} className="mt-1 text-sm text-muted-foreground">
              <TranslatedText text="Manage your solar plant fleet and drill into inverter-level details." />
            </motion.p>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImport}
              title="Upload CSV or Excel file"
              className="hidden"
            />
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-purple-500 transition-colors disabled:opacity-50"
            >
              {importing ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <TranslatedText text="Import CSV / Excel" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => { setAddPlantError(null); setAddPlantOpen(true); }}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <TranslatedText text="Add Plant" />
            </motion.button>
          </div>
        </div>

        {/* Import Result */}
        {importResult && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 rounded-lg border p-3 text-sm ${
              importResult.startsWith("Error")
                ? "border-red-500/30 bg-red-500/10 text-red-400"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            <FileSpreadsheet className="inline h-4 w-4 mr-2" />
            {importResult}
          </motion.div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1"><TranslatedText text="Total Plants" /></div>
            <div className="text-2xl font-bold text-foreground">{plants.length}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1"><TranslatedText text="Total Capacity" /></div>
            <div className="text-2xl font-bold text-foreground">{totalCapacity.toFixed(2)} <span className="text-sm font-normal">MW</span></div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1"><TranslatedText text="Total Inverters" /></div>
            <div className="text-2xl font-bold text-foreground">{totalInverters}</div>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground mb-1"><TranslatedText text="Avg Health" /></div>
            <div className="text-2xl font-bold text-foreground">{avgHealth}%</div>
          </div>
        </div>

        {/* Plant Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : plants.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
            <Factory className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              <TranslatedText text="No Plants Found" />
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              <TranslatedText text="Import a CSV/Excel file or seed the database to get started." />
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Import data"
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-500"
            >
              <Upload className="h-4 w-4" />
              <TranslatedText text="Import Data" />
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plants.map((plant) => (
              <PlantCard key={plant.id} plant={plant} onClick={() => router.push(`/inverters?plantId=${plant.id}`)} />
            ))}
          </div>
        )}

        {/* Add Plant Dialog */}
        <AddPlantDialog
          open={addPlantOpen}
          onOpenChange={(v) => { setAddPlantOpen(v); if (!v) setAddPlantError(null); }}
          onSave={(data) => createPlantMutation.mutate(data)}
          isSaving={createPlantMutation.isPending}
          error={addPlantError}
        />
      </motion.div>
    </AnimatePresence>
  );
}
