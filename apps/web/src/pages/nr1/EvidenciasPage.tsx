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
import { FileText, Plus, Download, Shield, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DOC_TYPE_LABELS: Record<string, string> = {
  gro: "GRO — Gerenciamento de Riscos Ocupacionais",
  pgr: "PGR — Programa de Gerenciamento de Riscos",
  laudo: "Laudo Técnico",
  ata: "Ata de Reunião CIPA",
  plano: "Plano de Ação",
  outro: "Outro Documento",
};

export default function EvidenciasPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "gro", version: "1.0", notes: "" });

  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiRequest("GET", "/nr1/campaigns"),
  });
  const activeCampaign = campaigns.find(c => c.status === "published") ?? campaigns[0];

  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: ["documents", activeCampaign?.id],
    queryFn: () => apiRequest("GET", `/nr1/campaigns/${activeCampaign?.id}/documents`),
    enabled: !!activeCampaign?.id,
  });

  const createDoc = useMutation({
    mutationFn: (data: any) => apiRequest("POST", `/nr1/campaigns/${activeCampaign?.id}/documents`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents", activeCampaign?.id] });
      setOpen(false);
      setForm({ title: "", type: "gro", version: "1.0", notes: "" });
      toast({ title: "Documento criado!" });
    },
  });

  const docsByType = (type: string) => documents.filter((d: any) => d.type === type);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Evidências GRO/PGR
          </h1>
          <p className="text-muted-foreground mt-1">
            Documentação técnica, laudos e evidências do processo de gestão de riscos
          </p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!activeCampaign}>
          <Plus className="h-4 w-4 mr-2" /> Novo Documento
        </Button>
      </div>

      {/* Info boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "GRO", count: docsByType("gro").length, icon: <Shield className="h-5 w-5 text-blue-500" />, desc: "Gerenciamento de Riscos" },
          { label: "PGR", count: docsByType("pgr").length, icon: <BookOpen className="h-5 w-5 text-purple-500" />, desc: "Programa de Gerenciamento" },
          { label: "Laudos", count: docsByType("laudo").length + docsByType("ata").length + docsByType("plano").length, icon: <FileText className="h-5 w-5 text-teal-500" />, desc: "Laudos e outros" },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-center gap-3">
                {item.icon}
                <div>
                  <div className="text-2xl font-bold">{item.count}</div>
                  <div className="text-xs text-muted-foreground">{item.label} — {item.desc}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document list */}
      {!activeCampaign ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p>Nenhuma campanha ativa. Crie uma campanha NR-1 primeiro.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded" />)}</div>
      ) : documents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhuma evidência registrada</p>
            <p className="text-sm mt-1">Adicione documentos técnicos, laudos e atas para compor o dossiê GRO/PGR</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {Object.entries(DOC_TYPE_LABELS).map(([type, typeLabel]) => {
            const docs = docsByType(type);
            if (docs.length === 0) return null;
            return (
              <div key={type}>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{typeLabel}</h3>
                <div className="grid gap-2">
                  {docs.map((doc: any) => (
                    <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="pt-3 pb-3 px-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-blue-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{doc.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Versão {doc.version ?? "1.0"} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                              {doc.notes && <span> · {doc.notes}</span>}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {doc.status === "signed" ? "✓ Assinado" : doc.status === "draft" ? "Rascunho" : doc.status}
                          </Badge>
                          <Button variant="ghost" size="sm" className="shrink-0">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Documento GRO/PGR</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Título do Documento</Label>
              <Input className="mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: GRO — Ciclo 2026 Q2" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_TYPE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{v.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Versão</Label>
                <Input className="mt-1" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} placeholder="1.0" />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Textarea className="mt-1" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Escopo, metodologia, responsáveis..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createDoc.mutate(form)} disabled={!form.title || createDoc.isPending}>
              {createDoc.isPending ? "Criando..." : "Criar Documento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
