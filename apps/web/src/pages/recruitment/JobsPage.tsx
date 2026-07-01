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
import { Plus, Briefcase, Users, ChevronRight, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: number;
  title: string;
  department?: string;
  description?: string;
  status: "draft" | "open" | "paused" | "closed";
  totalCandidates: number;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  draft: "outline",
  open: "default",
  paused: "secondary",
  closed: "secondary",
};
const statusLabels: Record<string, string> = {
  draft: "Rascunho", open: "Aberta", paused: "Pausada", closed: "Encerrada",
};

const BLANK_FORM = {
  title: "",
  department: "",
  description: "",
  requirements: "",
  companyValues: [] as string[],
  requiredCompetencies: [] as string[],
  idealPersonaDescription: "",
};

export default function JobsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [valueInput, setValueInput] = useState("");
  const [competencyInput, setCompetencyInput] = useState("");

  const { data: jobs = [], isLoading } = useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: () => apiRequest("GET", "/recruitment/jobs"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const job = await apiRequest("POST", "/recruitment/jobs", {
        title: data.title,
        department: data.department,
        description: data.description,
        requirements: data.requirements,
      }) as any;
      return { job, data };
    },
    onSuccess: async ({ job, data }) => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setOpen(false);
      setForm(BLANK_FORM);
      setValueInput("");
      setCompetencyInput("");
      toast({ title: "Vaga criada com sucesso!" });

      if (
        data.companyValues.length > 0 ||
        data.requiredCompetencies.length > 0 ||
        data.idealPersonaDescription
      ) {
        try {
          await apiRequest("PUT", `/recruitment/jobs/${job.id}/cultural-fit-config`, {
            companyValues: data.companyValues,
            requiredCompetencies: data.requiredCompetencies,
            idealPersonaDescription: data.idealPersonaDescription,
          });
          qc.invalidateQueries({ queryKey: ["jobs"] });
        } catch {
          toast({
            title: "Vaga salva. Configuração de fit cultural falhou — edite nos detalhes da vaga.",
            variant: "destructive",
          });
        }
      }
    },
    onError: () => {
      toast({ title: "Erro ao criar vaga", variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiRequest("PATCH", `/recruitment/jobs/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      qc.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  function addTag(
    field: "companyValues" | "requiredCompetencies",
    value: string,
    clear: () => void,
  ) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setForm(f => ({
      ...f,
      [field]: f[field].includes(trimmed) ? f[field] : [...f[field], trimmed],
    }));
    clear();
  }

  function removeTag(field: "companyValues" | "requiredCompetencies", tag: string) {
    setForm(f => ({ ...f, [field]: f[field].filter(t => t !== tag) }));
  }

  function handleClose() {
    setOpen(false);
    setForm(BLANK_FORM);
    setValueInput("");
    setCompetencyInput("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vagas</h1>
          <p className="text-muted-foreground mt-1">Gerencie suas vagas e pipelines de seleção</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Vaga
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Nenhuma vaga criada</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Crie sua primeira vaga para começar a atrair candidatos e usar a análise de fit cultural por IA.
            </p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Vaga
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map(j => (
            <Card key={j.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4 px-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={statusColors[j.status] as any}>{statusLabels[j.status]}</Badge>
                      {j.department && (
                        <span className="text-xs text-muted-foreground">{j.department}</span>
                      )}
                    </div>
                    <h3 className="font-semibold">{j.title}</h3>
                    <div className="flex gap-1 items-center mt-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>
                        {j.totalCandidates} candidato{j.totalCandidates !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {j.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id: j.id, status: "open" })}
                      >
                        Abrir Vaga
                      </Button>
                    )}
                    {j.status === "open" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus.mutate({ id: j.id, status: "closed" })}
                      >
                        Encerrar
                      </Button>
                    )}
                    <Link href={`/recruitment/jobs/${j.id}`}>
                      <Button size="sm" variant="outline">
                        Pipeline <ChevronRight className="h-3 w-3 ml-1" />
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
            <DialogTitle>Nova Vaga</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Cargo <span className="text-destructive">*</span></Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Ex: Analista de Dados Sênior"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Departamento</Label>
              <Input
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                placeholder="Ex: Tecnologia"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Descrição da Vaga</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Responsabilidades e contexto da vaga..."
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label>Requisitos Técnicos e Comportamentais</Label>
              <Textarea
                value={form.requirements}
                onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))}
                placeholder="Ex: 3+ anos de Python, experiência com BI, proatividade..."
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Fit Cultural (para análise por IA)</p>
              <div className="space-y-3">
                <div>
                  <Label>Valores da Empresa</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={valueInput}
                      onChange={e => setValueInput(e.target.value)}
                      placeholder="Ex: Inovação"
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag("companyValues", valueInput, () => setValueInput(""));
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addTag("companyValues", valueInput, () => setValueInput(""))}
                    >
                      Adicionar
                    </Button>
                  </div>
                  {form.companyValues.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.companyValues.map(v => (
                        <span
                          key={v}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2 py-0.5"
                        >
                          {v}
                          <button onClick={() => removeTag("companyValues", v)} className="hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Competências Necessárias</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={competencyInput}
                      onChange={e => setCompetencyInput(e.target.value)}
                      placeholder="Ex: Liderança"
                      onKeyDown={e => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag("requiredCompetencies", competencyInput, () => setCompetencyInput(""));
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        addTag("requiredCompetencies", competencyInput, () => setCompetencyInput(""))
                      }
                    >
                      Adicionar
                    </Button>
                  </div>
                  {form.requiredCompetencies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {form.requiredCompetencies.map(c => (
                        <span
                          key={c}
                          className="inline-flex items-center gap-1 rounded-full bg-secondary/20 text-secondary-foreground text-xs px-2 py-0.5"
                        >
                          {c}
                          <button
                            onClick={() => removeTag("requiredCompetencies", c)}
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label>Perfil Ideal do Candidato</Label>
                  <Textarea
                    value={form.idealPersonaDescription}
                    onChange={e => setForm(f => ({ ...f, idealPersonaDescription: e.target.value }))}
                    placeholder="Descreva o perfil comportamental ideal para esta vaga..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
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
              {createMutation.isPending ? "Criando..." : "Criar Vaga"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
