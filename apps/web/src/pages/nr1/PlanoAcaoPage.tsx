import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckSquare, Plus, Clock, CheckCircle, AlertTriangle, XCircle, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { status: "pending", label: "A Fazer", icon: <Clock className="h-4 w-4 text-slate-500" />, bg: "bg-slate-50 dark:bg-slate-900" },
  { status: "in_progress", label: "Em Andamento", icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, bg: "bg-amber-50 dark:bg-amber-950" },
  { status: "done", label: "Concluída", icon: <CheckCircle className="h-4 w-4 text-green-500" />, bg: "bg-green-50 dark:bg-green-950" },
  { status: "cancelled", label: "Cancelada", icon: <XCircle className="h-4 w-4 text-red-400" />, bg: "bg-red-50 dark:bg-red-950" },
];

const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-slate-200 text-slate-700",
  medium: "bg-yellow-200 text-yellow-800",
  high: "bg-orange-200 text-orange-800",
  critical: "bg-red-200 text-red-800",
};

const PRIORITY_LABEL: Record<string, string> = {
  low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica",
};

export default function PlanoAcaoPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", responsible: "", dueDate: "" });

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiRequest("GET", "/nr1/campaigns"),
  });
  const activeCampaign = campaigns.find(c => c.status === "published") ?? campaigns[0];

  const { data: actions = [], isLoading } = useQuery<any[]>({
    queryKey: ["actions", activeCampaign?.id],
    queryFn: () => apiRequest("GET", `/nr1/campaigns/${activeCampaign?.id}/actions`),
    enabled: !!activeCampaign?.id,
  });

  const createAction = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/nr1/campaigns/${activeCampaign?.id}/actions`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["actions", activeCampaign?.id] });
      setOpen(false);
      setForm({ title: "", description: "", priority: "medium", responsible: "", dueDate: "" });
      toast({ title: "Ação criada!" });
    },
  });

  const updateAction = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/nr1/campaigns/${activeCampaign?.id}/actions/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["actions", activeCampaign?.id] }); },
  });

  const byStatus = (status: string) => actions.filter(a => a.status === status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-teal-500" />
            Plano de Ação
          </h1>
          <p className="text-muted-foreground mt-1">Kanban de ações corretivas e preventivas — NR-1</p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!activeCampaign}>
          <Plus className="h-4 w-4 mr-2" /> Nova Ação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {COLUMNS.map(col => (
          <Card key={col.status}>
            <CardContent className="pt-3 pb-3 px-4">
              <div className="flex items-center gap-2">
                {col.icon}
                <span className="text-sm text-muted-foreground">{col.label}</span>
              </div>
              <div className="text-2xl font-bold mt-1">{byStatus(col.status).length}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Kanban */}
      {isLoading ? (
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map(col => (
            <div key={col.status} className={cn("rounded-lg p-3 min-h-[200px]", col.bg)}>
              <div className="flex items-center gap-2 mb-3 font-medium text-sm">
                {col.icon}
                {col.label}
                <span className="ml-auto bg-background rounded-full px-1.5 py-0.5 text-xs">{byStatus(col.status).length}</span>
              </div>
              <div className="space-y-2">
                {byStatus(col.status).map(action => (
                  <ActionCard key={action.id} action={action} onMove={(id, status) => updateAction.mutate({ id, status })} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Ação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Título da Ação</Label>
              <Input className="mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Treinamento de liderança" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_LABEL).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prazo</Label>
                <Input className="mt-1" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Responsável</Label>
              <Input className="mt-1" value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} placeholder="Nome ou área responsável" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea className="mt-1" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createAction.mutate(form)} disabled={!form.title || createAction.isPending}>
              {createAction.isPending ? "Criando..." : "Criar Ação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionCard({ action, onMove }: { action: any; onMove: (id: number, status: string) => void }) {
  const nextStatus: Record<string, string> = {
    pending: "in_progress", in_progress: "done", done: "pending", cancelled: "pending",
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-md p-3 shadow-sm border border-border/50 text-sm">
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 cursor-grab" />
        <div className="flex-1 min-w-0">
          <div className="font-medium leading-tight">{action.title}</div>
          {action.responsible && (
            <div className="text-xs text-muted-foreground mt-1">👤 {action.responsible}</div>
          )}
          {action.dueDate && (
            <div className="text-xs text-muted-foreground">📅 {new Date(action.dueDate).toLocaleDateString("pt-BR")}</div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", PRIORITY_COLOR[action.priority] ?? "bg-slate-100")}>
              {PRIORITY_LABEL[action.priority] ?? action.priority}
            </span>
            <button
              onClick={() => onMove(action.id, nextStatus[action.status] ?? "pending")}
              className="text-[10px] text-muted-foreground hover:text-foreground underline ml-auto"
            >
              Avançar →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
