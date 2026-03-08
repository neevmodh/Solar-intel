"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeUp, pageTransition } from "@/lib/motion";
import {
  fetchMaintenanceTasks,
  fetchAIAdvisor,
  fetchAllInverters,
  apiCreateMaintenanceTask,
  apiUpdateMaintenanceTask,
  apiDeleteMaintenanceTask,
  apiSyncAIMaintenanceTasks,
} from "@/lib/api-client";
import type { MaintenanceTaskAPI } from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Wrench, Calendar, User, AlertTriangle, CheckCircle2, RotateCw,
  Timer, MessageSquare, Plus, Play, Trash2, Mail, Filter, X,
  Sparkles, ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TranslatedText } from "@/components/ui/translated-text";
import type { MaintenanceStatus, RiskLevel } from "@/types";

const statusConfig: Record<MaintenanceStatus, { color: string; icon: React.ReactNode; label: string }> = {
  scheduled: { color: "text-blue-400 bg-blue-500/10 border-blue-500/20", icon: <Calendar className="h-3.5 w-3.5" />, label: "Scheduled" },
  "in-progress": { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", icon: <RotateCw className="h-3.5 w-3.5 animate-spin" />, label: "In Progress" },
  completed: { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Completed" },
  overdue: { color: "text-red-400 bg-red-500/10 border-red-500/20", icon: <AlertTriangle className="h-3.5 w-3.5" />, label: "Overdue" },
};

const priorityConfig: Record<RiskLevel, { color: string; label: string }> = {
  critical: { color: "text-red-400 bg-red-500/10 border-red-500/20", label: "Critical" },
  high: { color: "text-orange-400 bg-orange-500/10 border-orange-500/20", label: "High" },
  medium: { color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", label: "Medium" },
  low: { color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", label: "Low" },
};

const INPUT_CLS = "w-full rounded-lg border border-white/10 bg-surface-3 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function CreateTaskDialog({ open, onOpenChange, onSubmit, inverters, isPending }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (d: { inverterId: string; inverterName: string; task: string; priority: string; scheduledDate: string; estimatedDuration: string; assignedTo: string; notes: string }) => void;
  inverters: Array<{ id: string; name: string }>;
  isPending?: boolean;
}) {
  const defaultDate = new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];
  const [form, setForm] = useState({ inverterId: "", task: "", priority: "medium", scheduledDate: defaultDate, estimatedDuration: "3 hours", assignedTo: "Engineering Team", notes: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inv = inverters.find((i) => i.id === form.inverterId);
    onSubmit({ ...form, inverterName: inv?.name || form.inverterId });
    setForm({ inverterId: "", task: "", priority: "medium", scheduledDate: defaultDate, estimatedDuration: "3 hours", assignedTo: "Engineering Team", notes: "" });
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/10 bg-background p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="text-lg font-semibold text-foreground">Create Maintenance Task</Dialog.Title>
            <Dialog.Close asChild><button aria-label="Close" className="rounded-md p-1 hover:bg-surface-3"><X className="h-4 w-4 text-muted-foreground" /></button></Dialog.Close>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Inverter *</label>
              <select required aria-label="Select inverter" className={INPUT_CLS} value={form.inverterId} onChange={(e) => setForm((f) => ({ ...f, inverterId: e.target.value }))}>
                <option value="">Select inverter...</option>
                {inverters.map((inv) => (<option key={inv.id} value={inv.id}>{inv.name} ({inv.id})</option>))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Task Name *</label>
              <input required className={INPUT_CLS} placeholder="e.g. Preventive Maintenance, Panel Cleaning" value={form.task} onChange={(e) => setForm((f) => ({ ...f, task: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Priority *</label>
                <select aria-label="Select priority" className={INPUT_CLS} value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Scheduled Date *</label>
                <input required type="date" aria-label="Scheduled date" className={INPUT_CLS} value={form.scheduledDate} onChange={(e) => setForm((f) => ({ ...f, scheduledDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Estimated Duration</label>
                <input className={INPUT_CLS} placeholder="e.g. 3 hours" value={form.estimatedDuration} onChange={(e) => setForm((f) => ({ ...f, estimatedDuration: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Assigned To</label>
                <input className={INPUT_CLS} placeholder="Engineering Team" value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
              <textarea className={cn(INPUT_CLS, "resize-none h-20")} placeholder="Additional details..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Dialog.Close asChild><Button variant="outline" type="button" size="sm">Cancel</Button></Dialog.Close>
              <Button type="submit" size="sm" disabled={isPending} className="bg-blue-600 hover:bg-blue-700">
                {isPending ? <RotateCw className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />} {isPending ? "Creating..." : "Create Task"}</Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DeleteConfirmDialog({ open, onOpenChange, onConfirm, taskName }: {
  open: boolean; onOpenChange: (v: boolean) => void; onConfirm: () => void; taskName: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-background p-6 shadow-2xl">
          <Dialog.Title className="text-lg font-semibold mb-2">Delete Task</Dialog.Title>
          <p className="text-sm text-muted-foreground mb-4">Are you sure you want to delete <strong>&quot;{taskName}&quot;</strong>? This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Dialog.Close asChild><Button variant="outline" size="sm">Cancel</Button></Dialog.Close>
            <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={onConfirm}><Trash2 className="h-3.5 w-3.5 mr-1" /> Delete</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default function MaintenancePage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MaintenanceTaskAPI | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [syncing, setSyncing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance", statusFilter, priorityFilter],
    queryFn: () => fetchMaintenanceTasks({
      status: statusFilter !== "all" ? statusFilter : undefined,
      priority: priorityFilter !== "all" ? priorityFilter : undefined,
    }),
    staleTime: 10_000,
  });

  const { data: invertersData } = useQuery({ queryKey: ["inverters-list"], queryFn: fetchAllInverters, staleTime: 60_000 });
  const { data: aiData } = useQuery({ queryKey: ["aiAdvisor"], queryFn: fetchAIAdvisor, staleTime: 60_000 });
  const inverterOptions = (invertersData || []).map((inv) => ({ id: inv.id, name: inv.name }));

  const createMutation = useMutation({
    mutationFn: apiCreateMaintenanceTask,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance"] }); },
    onSettled: () => { setCreateOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: { status?: string } }) => apiUpdateMaintenanceTask(taskId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["maintenance"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: apiDeleteMaintenanceTask,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["maintenance"] }); setDeleteTarget(null); },
  });

  const handleSyncAI = useCallback(async () => {
    if (!aiData?.maintenanceSchedule?.length) return;
    setSyncing(true);
    try {
      await apiSyncAIMaintenanceTasks(aiData.maintenanceSchedule);
      qc.invalidateQueries({ queryKey: ["maintenance"] });
    } catch { /* silent */ } finally { setSyncing(false); }
  }, [aiData, qc]);

  const nextAction = (status: string) => {
    if (status === "scheduled") return { label: "Start", icon: <Play className="h-3.5 w-3.5" />, next: "in-progress", color: "bg-yellow-600 hover:bg-yellow-700" };
    if (status === "in-progress") return { label: "Complete", icon: <CheckCircle2 className="h-3.5 w-3.5" />, next: "completed", color: "bg-emerald-600 hover:bg-emerald-700" };
    return null;
  };

  if (isLoading || !data) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      </div>
    );
  }

  const { tasks, stats } = data;

  return (
    <motion.div variants={pageTransition} initial="initial" animate="animate" exit="exit" className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight"><TranslatedText text="Maintenance" /></h1>
          <p className="text-sm text-muted-foreground"><TranslatedText text="AI-prioritized maintenance schedule & task management" /></p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleSyncAI} disabled={syncing || !aiData?.maintenanceSchedule?.length} className="text-purple-400 border-purple-500/30 hover:bg-purple-500/10">
            {syncing ? <RotateCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            Sync AI Tasks
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> New Task
          </Button>
        </div>
      </div>

      <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Scheduled", count: stats.scheduled, icon: Calendar, color: "blue" },
          { label: "In Progress", count: stats.inProgress, icon: RotateCw, color: "yellow" },
          { label: "Completed", count: stats.completed, icon: CheckCircle2, color: "emerald" },
          { label: "Overdue", count: stats.overdue, icon: AlertTriangle, color: "red" },
        ].map((item) => (
          <motion.div key={item.label} variants={fadeUp}>
            <Card className="border-border/40 bg-surface-2">
              <CardContent className="flex items-center gap-4 p-5">
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl",
                  item.color === "blue" && "bg-blue-500/10", item.color === "yellow" && "bg-yellow-500/10",
                  item.color === "emerald" && "bg-emerald-500/10", item.color === "red" && "bg-red-500/10")}>
                  <item.icon className={cn("h-6 w-6",
                    item.color === "blue" && "text-blue-400", item.color === "yellow" && "text-yellow-400",
                    item.color === "emerald" && "text-emerald-400", item.color === "red" && "text-red-400")} />
                </div>
                <div>
                  <p className="text-3xl font-bold">{item.count}</p>
                  <p className="text-xs text-muted-foreground"><TranslatedText text={item.label} /></p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground"><Filter className="h-3.5 w-3.5" /> Filters:</div>
        <select aria-label="Filter by status" className="rounded-lg border border-white/10 bg-surface-3 px-3 py-1.5 text-xs text-foreground focus:border-blue-500 focus:outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option><option value="scheduled">Scheduled</option><option value="in-progress">In Progress</option><option value="completed">Completed</option><option value="overdue">Overdue</option>
        </select>
        <select aria-label="Filter by priority" className="rounded-lg border border-white/10 bg-surface-3 px-3 py-1.5 text-xs text-foreground focus:border-blue-500 focus:outline-none" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="all">All Priorities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
        </select>
        {(statusFilter !== "all" || priorityFilter !== "all") && (
          <button className="text-xs text-blue-400 hover:underline" onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); }}>Clear filters</button>
        )}
        <Badge variant="outline" className="ml-auto text-xs bg-surface-3 border-white/10">
          <ClipboardList className="h-3 w-3 mr-1" /> {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {tasks.length === 0 ? (
        <Card className="border-border/40 bg-surface-2">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No maintenance tasks found</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleSyncAI} disabled={!aiData?.maintenanceSchedule?.length}><Sparkles className="h-3.5 w-3.5 mr-1" /> Sync AI Tasks</Button>
              <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5 mr-1" /> Create Task</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-3">
          <AnimatePresence>
            {tasks.map((task) => {
              const sts = statusConfig[task.status as MaintenanceStatus] || statusConfig.scheduled;
              const pri = priorityConfig[task.priority as RiskLevel] || priorityConfig.medium;
              const act = nextAction(task.status);
              return (
                <motion.div key={task.taskId} variants={fadeUp} layout exit={{ opacity: 0, y: -10 }}>
                  <Card className={cn("border-border/40 bg-surface-2 transition-all hover:bg-surface-3", task.status === "completed" && "opacity-60")}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border", sts.color)}>
                          <Wrench className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-sm font-semibold"><TranslatedText text={task.task} /></span>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", sts.color)}>{sts.icon}<span className="ml-1"><TranslatedText text={sts.label} /></span></Badge>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", pri.color)}><TranslatedText text={pri.label} /> Priority</Badge>
                            {task.source === "ai" && <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-purple-400 bg-purple-500/10 border-purple-500/20"><Sparkles className="h-2.5 w-2.5 mr-0.5" /> AI</Badge>}
                            {task.emailSent && <span title="Email sent"><Mail className="h-3 w-3 text-emerald-400" /></span>}
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{task.inverterName} ({task.inverterId})</p>
                          <div className="flex items-center gap-4 flex-wrap text-[11px] text-foreground/70">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-blue-400" />{new Date(task.scheduledDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                            <span className="flex items-center gap-1"><Timer className="h-3 w-3 text-purple-400" />{task.estimatedDuration}</span>
                            <span className="flex items-center gap-1"><User className="h-3 w-3 text-emerald-400" />{task.assignedTo}</span>
                            {task.startedDate && <span className="flex items-center gap-1 text-yellow-400"><Play className="h-3 w-3" />Started {new Date(task.startedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                            {task.completedDate && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle2 className="h-3 w-3" />Done {new Date(task.completedDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>}
                          </div>
                          {task.notes && (
                            <div className="mt-3 flex items-start gap-2 rounded-md bg-surface-3 p-2.5">
                              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                              <p className="text-[11px] text-muted-foreground leading-relaxed"><TranslatedText text={task.notes} /></p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {act && (
                            <Button size="sm" className={cn("text-[11px] px-2.5 py-1 h-auto", act.color)}
                              onClick={() => updateMutation.mutate({ taskId: task.taskId, data: { status: act.next } })}
                              disabled={updateMutation.isPending}>
                              {act.icon}<span className="ml-1">{act.label}</span>
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="text-[11px] px-2.5 py-1 h-auto text-red-400 border-red-500/20 hover:bg-red-500/10"
                            onClick={() => setDeleteTarget(task)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <CreateTaskDialog open={createOpen} onOpenChange={setCreateOpen} inverters={inverterOptions} onSubmit={(d) => createMutation.mutate(d)} isPending={createMutation.isPending} />
      <DeleteConfirmDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)} taskName={deleteTarget?.task || ""} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.taskId)} />
    </motion.div>
  );
}
