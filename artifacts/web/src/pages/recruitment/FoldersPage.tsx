import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FolderOpen, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FoldersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", department: "", description: "" });

  const { data: folders = [] } = useQuery<any[]>({
    queryKey: ["folders"],
    queryFn: () => apiRequest("GET", "/recruitment/folders"),
  });

  const { data: folderCandidates = [] } = useQuery<any[]>({
    queryKey: ["folder-candidates", selected],
    queryFn: () => apiRequest("GET", `/recruitment/folders/${selected}/candidates`),
    enabled: selected != null,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/recruitment/folders", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["folders"] }); setOpen(false); setForm({ name: "", department: "", description: "" }); toast({ title: "Pasta criada!" }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Banco de Talentos</h1>
          <p className="text-muted-foreground mt-1">Organize candidatos em pastas por perfil ou departamento</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" />Nova Pasta</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-3">
          {folders.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma pasta criada.</p>
                <Button size="sm" className="mt-4" onClick={() => setOpen(true)}>Criar Pasta</Button>
              </CardContent>
            </Card>
          ) : (
            folders.map((f: any) => (
              <Card
                key={f.id}
                className={`cursor-pointer hover:shadow-md transition-shadow ${selected === f.id ? "border-primary ring-1 ring-primary" : ""}`}
                onClick={() => setSelected(f.id)}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <FolderOpen className={`h-5 w-5 ${selected === f.id ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{f.name}</p>
                      {f.department && <p className="text-xs text-muted-foreground">{f.department}</p>}
                    </div>
                    <span className="text-xs text-muted-foreground">{f.candidateCount}</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {selected != null && (
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Candidatos na pasta
                </CardTitle>
              </CardHeader>
              <CardContent>
                {folderCandidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum candidato nesta pasta.</p>
                ) : (
                  <div className="space-y-2">
                    {folderCandidates.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                        <div className="h-7 w-7 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-secondary">{c.name[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Pasta</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Devs Frontend, Líderes..." className="mt-1" /></div>
            <div><Label>Departamento</Label><Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} className="mt-1" /></div>
            <div><Label>Descrição</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate(form)} disabled={!form.name || createMutation.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
