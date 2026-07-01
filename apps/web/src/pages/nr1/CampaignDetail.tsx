import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Plus, ArrowLeft, Lock, CheckCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const campaignId = parseInt(id!);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: campaign } = useQuery({
    queryKey: ["campaign", campaignId],
    queryFn: () => apiRequest<any>("GET", `/nr1/campaigns/${campaignId}`),
  });

  const { data: aggregate } = useQuery({
    queryKey: ["aggregate", campaignId],
    queryFn: () => apiRequest<any>("GET", `/nr1/campaigns/${campaignId}/aggregate`),
  });

  const { data: riskFactors = [] } = useQuery<any[]>({
    queryKey: ["risk-factors", campaignId],
    queryFn: () => apiRequest("GET", `/nr1/campaigns/${campaignId}/risk-factors`),
  });

  const { data: actions = [] } = useQuery<any[]>({
    queryKey: ["actions", campaignId],
    queryFn: () => apiRequest("GET", `/nr1/campaigns/${campaignId}/actions`),
  });

  const [riskOpen, setRiskOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [riskForm, setRiskForm] = useState({ title: "", description: "", probability: "medium", severity: "medium", exposedGroups: "" });
  const [actionForm, setActionForm] = useState({ title: "", description: "", priority: "medium", responsible: "", dueDate: "" });

  const createRisk = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/nr1/campaigns/${campaignId}/risk-factors`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["risk-factors", campaignId] }); setRiskOpen(false); toast({ title: "Fator de risco criado!" }); },
  });

  const createAction = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/nr1/campaigns/${campaignId}/actions`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["actions", campaignId] }); setActionOpen(false); toast({ title: "Ação criada!" }); },
  });

  const updateAction = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/nr1/actions/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["actions", campaignId] }),
  });

  if (!campaign) return <div className="animate-pulse h-32 bg-muted rounded-lg" />;

  const radarData = aggregate?.dimensions?.map((d: any) => ({
    dimension: d.label,
    valor: d.average,
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/nr1">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">{campaign.title}</h1>
          <div className="flex gap-2 mt-1">
            <Badge variant={campaign.status === "published" ? "default" : "outline"}>{campaign.status}</Badge>
            {campaign.participationRate != null && (
              <span className="text-xs text-muted-foreground">{campaign.participationRate}% participação</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-primary">{campaign.totalInvited}</div><div className="text-xs text-muted-foreground mt-1">Convidados</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-secondary">{campaign.totalResponded}</div><div className="text-xs text-muted-foreground mt-1">Respostas</div></CardContent></Card>
        <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-accent">{riskFactors.length}</div><div className="text-xs text-muted-foreground mt-1">Fatores de Risco</div></CardContent></Card>
      </div>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Resultados</TabsTrigger>
          <TabsTrigger value="risks">Fatores de Risco</TabsTrigger>
          <TabsTrigger value="actions">Plano de Ação</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="mt-4">
          {aggregate?.belowThreshold ? (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="flex gap-3 pt-4">
                <Lock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-amber-800">Dados protegidos por privacidade</p>
                  <p className="text-sm text-amber-700 mt-1">
                    O número de respostas ({aggregate.sampleSize}) está abaixo do limiar mínimo de anonimização.
                    Os resultados serão exibidos quando houver respostas suficientes.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : radarData.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">Mapa de Dimensões ({aggregate.sampleSize} respondentes)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="dimension" className="text-xs" />
                    <Radar dataKey="valor" stroke="#0F4C75" fill="#0F4C75" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground text-sm">Nenhuma resposta coletada ainda.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="risks" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Fatores de Risco Identificados</h3>
            <Button size="sm" onClick={() => setRiskOpen(true)}>
              <Plus className="h-3 w-3 mr-1" /> Adicionar Risco
            </Button>
          </div>
          <div className="space-y-3">
            {riskFactors.map((rf: any) => (
              <Card key={rf.id}>
                <CardContent className="pt-3 pb-3 px-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex gap-2 mb-1">
                        <RiskLevelBadge level={rf.level} />
                        <span className="text-xs text-muted-foreground">Prob: {rf.probability} / Sev: {rf.severity}</span>
                      </div>
                      <p className="font-medium text-sm">{rf.title}</p>
                      {rf.description && <p className="text-xs text-muted-foreground mt-1">{rf.description}</p>}
                      {rf.exposedGroups && <p className="text-xs text-muted-foreground mt-1">Grupos expostos: {rf.exposedGroups}</p>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {riskFactors.length === 0 && (
              <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum fator de risco identificado ainda.</CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="actions" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold">Plano de Ação</h3>
            <Button size="sm" onClick={() => setActionOpen(true)}>
              <Plus className="h-3 w-3 mr-1" /> Nova Ação
            </Button>
          </div>
          <div className="space-y-3">
            {actions.map((a: any) => (
              <Card key={a.id}>
                <CardContent className="pt-3 pb-3 px-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex gap-2 mb-1">
                        <Badge variant={a.priority === "critical" ? "destructive" : a.priority === "high" ? "default" : "outline"} className="text-xs">{a.priority}</Badge>
                        <ActionStatusBadge status={a.status} />
                      </div>
                      <p className="font-medium text-sm">{a.title}</p>
                      {a.responsible && <p className="text-xs text-muted-foreground mt-1">Responsável: {a.responsible}</p>}
                      {a.dueDate && <p className="text-xs text-muted-foreground">Prazo: {new Date(a.dueDate).toLocaleDateString("pt-BR")}</p>}
                    </div>
                    {a.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => updateAction.mutate({ id: a.id, status: "in_progress" })}>
                        Iniciar
                      </Button>
                    )}
                    {a.status === "in_progress" && (
                      <Button size="sm" variant="outline" onClick={() => updateAction.mutate({ id: a.id, status: "done" })}>
                        Concluir
                      </Button>
                    )}
                    {a.status === "done" && <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />}
                  </div>
                </CardContent>
              </Card>
            ))}
            {actions.length === 0 && (
              <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhuma ação no plano ainda.</CardContent></Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Risk Dialog */}
      <Dialog open={riskOpen} onOpenChange={setRiskOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Fator de Risco</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Título</Label><Input value={riskForm.title} onChange={e => setRiskForm(f => ({ ...f, title: e.target.value }))} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Probabilidade</Label><Select value={riskForm.probability} onValueChange={v => setRiskForm(f => ({ ...f, probability: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="very_low">Muito Baixa</SelectItem><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="very_high">Muito Alta</SelectItem></SelectContent></Select></div>
              <div><Label>Severidade</Label><Select value={riskForm.severity} onValueChange={v => setRiskForm(f => ({ ...f, severity: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="very_low">Muito Baixa</SelectItem><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="very_high">Muito Alta</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Grupos Expostos</Label><Input value={riskForm.exposedGroups} onChange={e => setRiskForm(f => ({ ...f, exposedGroups: e.target.value }))} placeholder="Ex: equipe de vendas, líderes..." className="mt-1" /></div>
            <div><Label>Descrição</Label><Textarea value={riskForm.description} onChange={e => setRiskForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRiskOpen(false)}>Cancelar</Button>
            <Button onClick={() => createRisk.mutate(riskForm)} disabled={!riskForm.title || createRisk.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Ação</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Título</Label><Input value={actionForm.title} onChange={e => setActionForm(f => ({ ...f, title: e.target.value }))} className="mt-1" /></div>
            <div><Label>Prioridade</Label><Select value={actionForm.priority} onValueChange={v => setActionForm(f => ({ ...f, priority: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="low">Baixa</SelectItem><SelectItem value="medium">Média</SelectItem><SelectItem value="high">Alta</SelectItem><SelectItem value="critical">Crítica</SelectItem></SelectContent></Select></div>
            <div><Label>Responsável</Label><Input value={actionForm.responsible} onChange={e => setActionForm(f => ({ ...f, responsible: e.target.value }))} className="mt-1" /></div>
            <div><Label>Prazo</Label><Input type="date" value={actionForm.dueDate} onChange={e => setActionForm(f => ({ ...f, dueDate: e.target.value }))} className="mt-1" /></div>
            <div><Label>Descrição</Label><Textarea value={actionForm.description} onChange={e => setActionForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionOpen(false)}>Cancelar</Button>
            <Button onClick={() => createAction.mutate(actionForm)} disabled={!actionForm.title || createAction.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RiskLevelBadge({ level }: { level: string }) {
  const map: Record<string, string> = { critical: "bg-red-100 text-red-700 border-red-200", high: "bg-orange-100 text-orange-700 border-orange-200", moderate: "bg-yellow-100 text-yellow-700 border-yellow-200", low: "bg-green-100 text-green-700 border-green-200" };
  const labels: Record<string, string> = { critical: "Crítico", high: "Alto", moderate: "Moderado", low: "Baixo" };
  return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[level] ?? ""}`}>{labels[level] ?? level}</span>;
}

function ActionStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { pending: "bg-muted text-muted-foreground", in_progress: "bg-blue-100 text-blue-700", done: "bg-green-100 text-green-700", cancelled: "bg-gray-100 text-gray-500" };
  const labels: Record<string, string> = { pending: "Pendente", in_progress: "Em Andamento", done: "Concluída", cancelled: "Cancelada" };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? ""}`}>{labels[status] ?? status}</span>;
}
