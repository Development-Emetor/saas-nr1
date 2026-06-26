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
import { AlertTriangle, Plus, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PROB_LABELS = ["Improvável", "Possível", "Provável", "Frequente"];
const SEV_LABELS = ["Leve", "Moderado", "Grave", "Crítico"];
const PROB_VALUES = ["unlikely", "possible", "probable", "frequent"];
const SEV_VALUES = ["low", "medium", "high", "critical"];

function riskLevel(prob: string, sev: string): { label: string; color: string } {
  const p = PROB_VALUES.indexOf(prob);
  const s = SEV_VALUES.indexOf(sev);
  const score = (p + 1) * (s + 1);
  if (score >= 9) return { label: "Crítico", color: "bg-red-600 text-white" };
  if (score >= 5) return { label: "Alto", color: "bg-orange-500 text-white" };
  if (score >= 3) return { label: "Médio", color: "bg-yellow-400 text-black" };
  return { label: "Baixo", color: "bg-green-500 text-white" };
}

export default function MatrizRiscoPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", probability: "possible", severity: "medium", exposedGroups: "",
  });

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiRequest("GET", "/nr1/campaigns"),
  });

  const activeCampaign = campaigns.find(c => c.status === "published") ?? campaigns[0];

  const { data: risks = [], isLoading } = useQuery<any[]>({
    queryKey: ["risk-factors", activeCampaign?.id],
    queryFn: () => apiRequest("GET", `/nr1/campaigns/${activeCampaign?.id}/risk-factors`),
    enabled: !!activeCampaign?.id,
  });

  const createRisk = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/nr1/campaigns/${activeCampaign?.id}/risk-factors`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["risk-factors", activeCampaign?.id] });
      setOpen(false);
      setForm({ title: "", description: "", probability: "possible", severity: "medium", exposedGroups: "" });
      toast({ title: "Fator de risco adicionado!" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            Matriz de Risco
          </h1>
          <p className="text-muted-foreground mt-1">
            Avaliação de riscos psicossociais — Probabilidade × Severidade
          </p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!activeCampaign}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Risco
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Crítico", color: "bg-red-600" },
          { label: "Alto", color: "bg-orange-500" },
          { label: "Médio", color: "bg-yellow-400" },
          { label: "Baixo", color: "bg-green-500" },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-sm">
            <span className={cn("h-3 w-3 rounded-sm", l.color)} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Visual Matrix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Grade de Probabilidade × Severidade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="p-2 border bg-muted text-left w-28">Prob \ Sev</th>
                  {SEV_LABELS.map(s => (
                    <th key={s} className="p-2 border bg-muted text-center font-medium">{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...PROB_VALUES].reverse().map((prob, ri) => (
                  <tr key={prob}>
                    <td className="p-2 border bg-muted font-medium text-xs">
                      {PROB_LABELS[PROB_VALUES.length - 1 - ri]}
                    </td>
                    {SEV_VALUES.map(sev => {
                      const cellRisks = risks.filter(r => r.probability === prob && r.severity === sev);
                      const lvl = riskLevel(prob, sev);
                      return (
                        <td key={sev} className={cn("p-2 border min-w-[120px] align-top", lvl.color, "bg-opacity-20")}>
                          <div className={cn("text-[10px] font-bold mb-1 opacity-70")}>{lvl.label}</div>
                          {cellRisks.map(r => (
                            <div key={r.id} className="text-xs bg-white/80 dark:bg-black/30 rounded px-1.5 py-0.5 mb-1 shadow-sm">
                              {r.title}
                            </div>
                          ))}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Risk List */}
      {!activeCampaign ? (
        <Card className="border-dashed">
          <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
            <Info className="h-5 w-5" />
            <p>Nenhuma campanha disponível. Crie uma campanha NR-1 primeiro.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : risks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum fator de risco mapeado</p>
            <p className="text-sm mt-1">Adicione os riscos identificados na avaliação psicossocial</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {risks.map(r => {
            const lvl = riskLevel(r.probability, r.severity);
            return (
              <Card key={r.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4 px-4">
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-0.5 px-2 py-0.5 rounded text-xs font-bold shrink-0", lvl.color)}>
                      {lvl.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{r.title}</div>
                      {r.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>}
                      <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                        <span>Prob: {PROB_LABELS[PROB_VALUES.indexOf(r.probability)]}</span>
                        <span>•</span>
                        <span>Sev: {SEV_LABELS[SEV_VALUES.indexOf(r.severity)]}</span>
                      </div>
                      {r.exposedGroups && (
                        <div className="text-xs text-muted-foreground mt-1">Grupos: {r.exposedGroups}</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Fator de Risco</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Fator de Risco</Label>
              <Input className="mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Sobrecarga de trabalho" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Probabilidade</Label>
                <Select value={form.probability} onValueChange={v => setForm(f => ({ ...f, probability: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROB_VALUES.map((v, i) => <SelectItem key={v} value={v}>{PROB_LABELS[i]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Severidade</Label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEV_VALUES.map((v, i) => <SelectItem key={v} value={v}>{SEV_LABELS[i]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Grupos Expostos</Label>
              <Input className="mt-1" value={form.exposedGroups} onChange={e => setForm(f => ({ ...f, exposedGroups: e.target.value }))} placeholder="Ex: Operacional, Liderança" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea className="mt-1" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Contexto e fontes de evidência..." />
            </div>
            <div className={cn("rounded-md px-3 py-2 text-sm font-medium", riskLevel(form.probability, form.severity).color)}>
              Nível resultante: {riskLevel(form.probability, form.severity).label}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createRisk.mutate(form)} disabled={!form.title || createRisk.isPending}>
              {createRisk.isPending ? "Salvando..." : "Salvar Risco"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
