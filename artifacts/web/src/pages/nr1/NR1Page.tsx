import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ClipboardList, Play, BarChart2, Calendar } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Campaign {
  id: number;
  title: string;
  description?: string;
  status: "draft" | "published" | "closed" | "analyzing";
  instrumentType: string;
  totalInvited: number;
  totalResponded: number;
  participationRate?: number;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

const statusLabel: Record<string, string> = {
  draft: "Rascunho",
  published: "Em Andamento",
  closed: "Encerrada",
  analyzing: "Analisando",
};
const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  published: "default",
  closed: "secondary",
  analyzing: "secondary",
};

const BLANK_FORM = {
  title: "",
  organization: "",
  description: "",
  instrumentType: "demand_control",
  startDate: "",
  endDate: "",
};

export default function NR1Page() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiRequest("GET", "/nr1/campaigns"),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) =>
      apiRequest("POST", "/nr1/campaigns", {
        title: data.title,
        description: data.description
          ? `${data.organization ? `[${data.organization}] ` : ""}${data.description}`
          : data.organization
          ? `[${data.organization}]`
          : undefined,
        instrumentType: data.instrumentType,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setOpen(false);
      setForm(BLANK_FORM);
      toast({ title: "Campanha criada com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao criar campanha", variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (id: number) => apiRequest("POST", `/nr1/campaigns/${id}/publish`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campaigns"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast({ title: "Campanha publicada!" });
    },
  });

  function handleClose() {
    setOpen(false);
    setForm(BLANK_FORM);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">NR-1 Psicossocial</h1>
          <p className="text-muted-foreground mt-1">Gestão de riscos psicossociais conforme NR-1 vigente</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState onNew={() => setOpen(true)} />
      ) : (
        <div className="grid gap-4">
          {campaigns.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4 px-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusVariant[c.status]}>{statusLabel[c.status]}</Badge>
                      <span className="text-xs text-muted-foreground">{instrumentLabel(c.instrumentType)}</span>
                    </div>
                    <h3 className="font-semibold">{c.title}</h3>
                    {c.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                      <span>{c.totalInvited} convidados</span>
                      <span>{c.totalResponded} respostas</span>
                      {c.participationRate != null && <span>{c.participationRate}% participação</span>}
                      {(c.startDate || c.endDate) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {c.startDate ? new Date(c.startDate).toLocaleDateString("pt-BR") : "—"}
                          {" → "}
                          {c.endDate ? new Date(c.endDate).toLocaleDateString("pt-BR") : "Em aberto"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {c.status === "draft" && (
                      <Button
                        size="sm"
                        onClick={() => publishMutation.mutate(c.id)}
                        disabled={publishMutation.isPending}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Publicar
                      </Button>
                    )}
                    <Link href={`/nr1/${c.id}`}>
                      <Button size="sm" variant="outline">
                        <BarChart2 className="h-3 w-3 mr-1" />
                        Detalhes
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={v => (v ? setOpen(true) : handleClose())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Campanha NR-1</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Título da Campanha <span className="text-destructive">*</span></Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Pesquisa de Clima 2026"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Organização / Setor</Label>
              <Input
                value={form.organization}
                onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
                placeholder="Ex: Matriz — RH, Filial SP, Operações"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Instrumento de Avaliação</Label>
              <Select value={form.instrumentType} onValueChange={v => setForm(f => ({ ...f, instrumentType: v }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demand_control">Demanda-Controle (Karasek)</SelectItem>
                  <SelectItem value="effort_reward">Esforço-Recompensa (Siegrist)</SelectItem>
                  <SelectItem value="custom">Questionário Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Data de Encerramento</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Objetivo e contexto da campanha..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.title || createMutation.isPending}
            >
              {createMutation.isPending ? "Criando..." : "Criar Campanha"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function instrumentLabel(t: string) {
  return t === "demand_control"
    ? "Demanda-Controle"
    : t === "effort_reward"
    ? "Esforço-Recompensa"
    : "Personalizado";
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center py-16 text-center">
        <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">Nenhuma campanha criada</h3>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
          Crie sua primeira campanha de avaliação de riscos psicossociais conforme a NR-1.
        </p>
        <Button onClick={onNew}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Primeira Campanha
        </Button>
      </CardContent>
    </Card>
  );
}
