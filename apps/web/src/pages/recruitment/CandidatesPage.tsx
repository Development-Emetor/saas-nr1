import { useState, useRef } from "react";
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
import { Plus, Users, Star, Loader2, ChevronRight, Sparkles, Upload, FileText, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface CandidateSummary {
  id: number;
  name: string;
  email?: string;
  jobId?: number;
  jobTitle?: string;
  stage: string;
  fitScore?: number;
  createdAt: string;
}

interface Job {
  id: number;
  title: string;
  department?: string;
  status: string;
}

const stageLabel: Record<string, string> = {
  screening: "Triagem",
  interview: "Entrevista",
  offer: "Proposta",
  hired: "Contratado",
  rejected: "Reprovado",
};
const stageColor: Record<string, string> = {
  screening: "outline",
  interview: "default",
  offer: "secondary",
  hired: "default",
  rejected: "destructive",
};

const BLANK_FORM = {
  name: "",
  email: "",
  phone: "",
  cvText: "",
  linkedinUrl: "",
  jobId: "" as string | number,
  autoAnalyze: true,
};

export default function CandidatesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState<number | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: candidates = [], isLoading } = useQuery<CandidateSummary[]>({
    queryKey: ["candidates"],
    queryFn: () => apiRequest("GET", "/recruitment/candidates"),
  });

  const { data: jobs = [] } = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: () => apiRequest("GET", "/recruitment/jobs"),
  });

  const openJobs = jobs.filter(j => j.status === "open" || j.status === "draft");

  function handleFileUpload(file: File) {
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    const allowed = ["txt", "pdf", "doc", "docx"];
    if (ext && !allowed.includes(ext)) {
      toast({ title: "Formato não suportado. Use .txt, .pdf, .doc ou .docx", variant: "destructive" });
      return;
    }
    setUploadLoading(true);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setForm(f => ({ ...f, cvText: text }));
      setUploadedFileName(file.name);
      setUploadLoading(false);
    };
    reader.onerror = () => {
      toast({ title: "Erro ao ler o arquivo", variant: "destructive" });
      setUploadLoading(false);
    };
    reader.readAsText(file, "utf-8");
  }

  function clearUploadedFile() {
    setUploadedFileName(null);
    setForm(f => ({ ...f, cvText: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const analyzeMutation = useMutation({
    mutationFn: async ({ candidateId, jobId }: { candidateId: number; jobId?: number }) => {
      setAnalyzing(candidateId);
      return apiRequest("POST", `/recruitment/candidates/${candidateId}/analyze`, { jobId });
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      toast({ title: `Análise concluída! Fit Score: ${Math.round(data.fitScore)}%` });
      setAnalyzing(null);
    },
    onError: () => {
      setAnalyzing(null);
      toast({ title: "Erro na análise IA", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        cvText: data.cvText || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        jobId: data.jobId ? Number(data.jobId) : undefined,
      };
      const candidate = await apiRequest("POST", "/recruitment/candidates", payload) as any;
      return { candidate, shouldAnalyze: data.autoAnalyze && !!data.cvText, jobId: data.jobId };
    },
    onSuccess: async ({ candidate, shouldAnalyze, jobId }) => {
      qc.invalidateQueries({ queryKey: ["candidates"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setOpen(false);
      setForm(BLANK_FORM);
      setUploadedFileName(null);

      if (shouldAnalyze) {
        toast({ title: "Candidato salvo! Iniciando análise IA…" });
        try {
          const result = await apiRequest("POST", `/recruitment/candidates/${candidate.id}/analyze`, {
            jobId: jobId ? Number(jobId) : undefined,
          }) as any;
          qc.invalidateQueries({ queryKey: ["candidates"] });
          toast({ title: `Análise concluída! Fit Score: ${Math.round(result.fitScore)}%` });
        } catch {
          toast({
            title: "Candidato salvo. Análise IA falhou — tente novamente pela lista.",
            variant: "destructive",
          });
        }
      } else {
        toast({ title: "Candidato adicionado com sucesso!" });
      }
    },
    onError: () => {
      toast({ title: "Erro ao salvar candidato", variant: "destructive" });
    },
  });

  function handleClose() {
    setOpen(false);
    setForm(BLANK_FORM);
    setUploadedFileName(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const hasCv = !!form.cvText;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Candidatos</h1>
          <p className="text-muted-foreground mt-1">Banco de talentos com análise de fit cultural por IA</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Candidato
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : candidates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nenhum candidato cadastrado</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Adicione candidatos e use a IA para analisar o fit cultural com as vagas abertas.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Candidato
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {candidates.map(c => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {c.name[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{c.name}</p>
                      <div className="flex gap-2 items-center flex-wrap">
                        {c.email && (
                          <span className="text-xs text-muted-foreground truncate">{c.email}</span>
                        )}
                        <Badge variant={stageColor[c.stage] as any} className="text-xs">
                          {stageLabel[c.stage]}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.fitScore != null ? (
                      <div className="flex items-center gap-1 text-sm font-semibold text-secondary">
                        <Star className="h-3.5 w-3.5 fill-secondary" />
                        {Math.round(c.fitScore)}%
                      </div>
                    ) : analyzing === c.id ? (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Analisando…
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          analyzeMutation.mutate({ candidateId: c.id, jobId: c.jobId })
                        }
                        disabled={analyzing != null}
                      >
                        <Star className="h-3 w-3 mr-1" />
                        Analisar IA
                      </Button>
                    )}
                    <Link href={`/recruitment/candidates/${c.id}`}>
                      <Button size="sm" variant="ghost" className="px-2">
                        <ChevronRight className="h-4 w-4" />
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Candidato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome <span className="text-destructive">*</span></Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Nome completo"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Telefone</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="(11) 99999-0000"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>LinkedIn</Label>
                <Input
                  value={form.linkedinUrl}
                  onChange={e => setForm(f => ({ ...f, linkedinUrl: e.target.value }))}
                  placeholder="linkedin.com/in/..."
                  className="mt-1"
                />
              </div>
            </div>

            {openJobs.length > 0 && (
              <div>
                <Label>Vaga de Interesse</Label>
                <Select
                  value={form.jobId ? String(form.jobId) : "none"}
                  onValueChange={v => setForm(f => ({ ...f, jobId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione uma vaga (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem vaga específica</SelectItem>
                    {openJobs.map(j => (
                      <SelectItem key={j.id} value={String(j.id)}>
                        {j.title}
                        {j.department ? ` — ${j.department}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Currículo</Label>
              <div className="mt-1 space-y-2">
                {uploadedFileName ? (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="flex-1 truncate">{uploadedFileName}</span>
                    <button onClick={clearUploadedFile} className="hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-muted-foreground/25 p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileUpload(file);
                    }}
                  >
                    {uploadLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : (
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {uploadLoading ? "Lendo arquivo…" : "Arraste ou clique para enviar"}
                      </p>
                      <p className="text-xs text-muted-foreground">.txt, .pdf, .doc, .docx</p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <Textarea
                  value={form.cvText}
                  onChange={e => {
                    setUploadedFileName(null);
                    setForm(f => ({ ...f, cvText: e.target.value }));
                  }}
                  placeholder="Ou cole aqui o texto do currículo…"
                  rows={3}
                />
              </div>
            </div>

            {hasCv && (
              <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Análise IA automática</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    A IA analisará o currículo e calculará o fit score após salvar.
                  </p>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={form.autoAnalyze}
                    onChange={e => setForm(f => ({ ...f, autoAnalyze: e.target.checked }))}
                    className="accent-primary"
                  />
                  <span className="text-xs">Ativar</span>
                </label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                  {form.autoAnalyze && hasCv ? "Salvando…" : "Salvando…"}
                </>
              ) : (
                "Salvar Candidato"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
