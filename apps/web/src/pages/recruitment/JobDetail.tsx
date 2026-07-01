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
import { ArrowLeft, Plus, Star, Loader2, Users, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const stageLabel: Record<string, string> = {
  screening: "Triagem", interview: "Entrevista", offer: "Proposta", hired: "Contratado", rejected: "Reprovado"
};

export default function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const jobId = parseInt(id!);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [candidateForm, setCandidateForm] = useState({ name: "", email: "", cvText: "", linkedinUrl: "" });
  const [configForm, setConfigForm] = useState({ companyValues: "", requiredCompetencies: "", idealPersonaDescription: "" });

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => apiRequest<any>("GET", `/recruitment/jobs/${jobId}`),
  });

  const { data: candidates = [] } = useQuery<any[]>({
    queryKey: ["job-candidates", jobId],
    queryFn: () => apiRequest("GET", `/recruitment/jobs/${jobId}/candidates`),
  });

  const { data: pipelineStats } = useQuery({
    queryKey: ["pipeline-stats", jobId],
    queryFn: () => apiRequest<any>("GET", `/recruitment/jobs/${jobId}/pipeline-stats`),
  });

  const { data: fitConfig } = useQuery({
    queryKey: ["cultural-fit-config", jobId],
    queryFn: () => apiRequest<any>("GET", `/recruitment/jobs/${jobId}/cultural-fit-config`),
  });

  // Prefill config form when fitConfig loads
  const [configPrefilled, setConfigPrefilled] = useState(false);
  if (fitConfig && !configPrefilled) {
    setConfigForm({
      companyValues: (fitConfig.companyValues ?? []).join(", "),
      requiredCompetencies: (fitConfig.requiredCompetencies ?? []).join(", "),
      idealPersonaDescription: fitConfig.idealPersonaDescription ?? "",
    });
    setConfigPrefilled(true);
  }

  const addCandidateMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/recruitment/candidates", { ...data, jobId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-candidates", jobId] });
      setAddOpen(false);
      setCandidateForm({ name: "", email: "", cvText: "", linkedinUrl: "" });
      toast({ title: "Candidato adicionado!" });
    },
  });

  const saveConfigMutation = useMutation({
    mutationFn: (data: any) => apiRequest("PUT", `/recruitment/jobs/${jobId}/cultural-fit-config`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cultural-fit-config", jobId] });
      setConfigOpen(false);
      toast({ title: "Configuração de fit salva!" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      setAnalyzing(candidateId);
      return apiRequest("POST", `/recruitment/candidates/${candidateId}/analyze`, { jobId });
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["job-candidates", jobId] });
      toast({ title: `Fit Score: ${data.fitScore}%` });
      setAnalyzing(null);
    },
    onError: () => setAnalyzing(null),
  });

  const moveStageMutation = useMutation({
    mutationFn: ({ candidateId, stage }: { candidateId: number; stage: string }) =>
      apiRequest("POST", `/recruitment/candidates/${candidateId}/move-stage`, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["job-candidates", jobId] }),
  });

  if (isLoading) return <div className="h-64 bg-muted animate-pulse rounded-lg" />;

  const stages = ["screening", "interview", "offer", "hired", "rejected"] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/recruitment/jobs">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{job?.title}</h1>
          <div className="flex gap-2 mt-1">
            {job?.department && <Badge variant="outline">{job.department}</Badge>}
            <Badge>{job?.status}</Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => setConfigOpen(true)}>Configurar Fit Cultural</Button>
        <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" />Candidato</Button>
      </div>

      {/* Pipeline Stats */}
      {pipelineStats && (
        <div className="grid grid-cols-5 gap-2">
          {pipelineStats.stages?.map((s: any) => (
            <Card key={s.stage}>
              <CardContent className="py-3 text-center">
                <div className="text-xl font-bold text-primary">{s.count}</div>
                <div className="text-xs text-muted-foreground mt-1">{stageLabel[s.stage]}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="mt-4">
          {candidates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum candidato nesta vaga ainda.</p>
                <Button className="mt-4" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-2" />Adicionar Candidato</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {candidates.map((c: any) => (
                <Card key={c.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3 justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-secondary">{c.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          <div className="flex gap-2 items-center mt-0.5">
                            <Badge variant="outline" className="text-xs">{stageLabel[c.stage]}</Badge>
                            {c.fitScore != null && (
                              <span className="flex items-center gap-1 text-xs font-semibold text-secondary">
                                <Star className="h-3 w-3 fill-secondary" /> {Math.round(c.fitScore)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {c.fitScore == null && (
                          <Button size="sm" variant="outline" onClick={() => analyzeMutation.mutate(c.id)} disabled={analyzing === c.id}>
                            {analyzing === c.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Star className="h-3 w-3 mr-1" />}
                            IA
                          </Button>
                        )}
                        <Link href={`/recruitment/candidates/${c.id}`}>
                          <Button size="sm" variant="outline">Ver</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="kanban" className="mt-4">
          <div className="grid grid-cols-5 gap-3 overflow-x-auto">
            {stages.map(stage => {
              const stageCandidates = candidates.filter((c: any) => c.stage === stage);
              return (
                <div key={stage} className="min-w-[160px]">
                  <div className="font-medium text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                    {stageLabel[stage]} ({stageCandidates.length})
                  </div>
                  <div className="space-y-2">
                    {stageCandidates.map((c: any) => (
                      <Card key={c.id} className="cursor-pointer hover:shadow-sm">
                        <CardContent className="py-2 px-3">
                          <p className="font-medium text-xs truncate">{c.name}</p>
                          {c.fitScore != null && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-secondary font-semibold">
                              <Star className="h-2.5 w-2.5 fill-secondary" /> {Math.round(c.fitScore)}%
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {stageCandidates.length === 0 && (
                      <div className="h-10 border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground">Vazio</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Candidate Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar Candidato</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome</Label><Input value={candidateForm.name} onChange={e => setCandidateForm(f => ({ ...f, name: e.target.value }))} className="mt-1" /></div>
              <div><Label>Email</Label><Input value={candidateForm.email} onChange={e => setCandidateForm(f => ({ ...f, email: e.target.value }))} className="mt-1" /></div>
            </div>
            <div><Label>LinkedIn</Label><Input value={candidateForm.linkedinUrl} onChange={e => setCandidateForm(f => ({ ...f, linkedinUrl: e.target.value }))} className="mt-1" /></div>
            <div><Label>CV / Resumo</Label><Textarea value={candidateForm.cvText} onChange={e => setCandidateForm(f => ({ ...f, cvText: e.target.value }))} className="mt-1" rows={4} placeholder="Cole o texto do CV para análise IA..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancelar</Button>
            <Button onClick={() => addCandidateMutation.mutate(candidateForm)} disabled={!candidateForm.name || addCandidateMutation.isPending}>
              {addCandidateMutation.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cultural Fit Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configurar Fit Cultural</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Valores da Empresa (separados por vírgula)</Label><Textarea value={configForm.companyValues} onChange={e => setConfigForm(f => ({ ...f, companyValues: e.target.value }))} className="mt-1" rows={2} placeholder="Inovação, Colaboração, Integridade..." /></div>
            <div><Label>Competências Necessárias</Label><Textarea value={configForm.requiredCompetencies} onChange={e => setConfigForm(f => ({ ...f, requiredCompetencies: e.target.value }))} className="mt-1" rows={2} placeholder="Liderança, Comunicação, Análise de dados..." /></div>
            <div><Label>Perfil Ideal (descrição livre)</Label><Textarea value={configForm.idealPersonaDescription} onChange={e => setConfigForm(f => ({ ...f, idealPersonaDescription: e.target.value }))} className="mt-1" rows={3} placeholder="Descreva as características do candidato ideal para esta vaga..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveConfigMutation.mutate({
              companyValues: configForm.companyValues.split(",").map(v => v.trim()).filter(Boolean),
              requiredCompetencies: configForm.requiredCompetencies.split(",").map(v => v.trim()).filter(Boolean),
              idealPersonaDescription: configForm.idealPersonaDescription,
            })} disabled={saveConfigMutation.isPending}>
              {saveConfigMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
