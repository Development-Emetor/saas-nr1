import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building, Plus, CheckCircle, XCircle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const PLAN_LABELS: Record<string, string> = {
  essencial: "Essencial",
  gestao: "Gestão",
  enterprise: "Enterprise",
};

const PLAN_COLORS: Record<string, string> = {
  essencial: "bg-slate-100 text-slate-700",
  gestao: "bg-blue-100 text-blue-800",
  enterprise: "bg-purple-100 text-purple-800",
};

export default function ClientesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", plan: "essencial" });

  const { data: clients = [], isLoading } = useQuery<any[]>({
    queryKey: ["clients"],
    queryFn: () => apiRequest("GET", "/clients"),
  });

  const createClient = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/clients", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setForm({ name: "", slug: "", plan: "essencial" });
      toast({ title: "Cliente criado com sucesso!" });
    },
    onError: () => toast({ title: "Erro ao criar cliente", variant: "destructive" }),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiRequest("PATCH", `/clients/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });

  const active = clients.filter(c => c.active !== false);
  const inactive = clients.filter(c => c.active === false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building className="h-6 w-6 text-[#0F4C75]" />
            Gestão de Clientes
          </h1>
          <p className="text-muted-foreground mt-1">Tenants / empresas clientes da plataforma</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="text-3xl font-bold">{clients.length}</div>
            <div className="text-sm text-muted-foreground">Total de clientes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="text-3xl font-bold text-green-600">{active.length}</div>
            <div className="text-sm text-muted-foreground">Ativos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4 px-4">
            <div className="text-3xl font-bold text-slate-400">{inactive.length}</div>
            <div className="text-sm text-muted-foreground">Inativos</div>
          </CardContent>
        </Card>
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : clients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum cliente cadastrado</p>
            <p className="text-sm mt-1">Adicione o primeiro cliente da plataforma</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {clients.map(client => (
            <Card key={client.id} className={cn("hover:shadow-sm transition-shadow", client.active === false && "opacity-60")}>
              <CardContent className="pt-3 pb-3 px-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-[#0F4C75]/10 flex items-center justify-center shrink-0 font-bold text-[#0F4C75]">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{client.name}</span>
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{client.slug}</code>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className={cn("text-xs", PLAN_COLORS[client.plan] ?? "bg-slate-100")}>
                        {PLAN_LABELS[client.plan] ?? client.plan}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Criado em {new Date(client.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleActive.mutate({ id: client.id, active: client.active === false })}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {client.active === false
                        ? <><XCircle className="h-4 w-4 text-red-400" /> Inativo</>
                        : <><CheckCircle className="h-4 w-4 text-green-500" /> Ativo</>
                      }
                    </button>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nome da Empresa</Label>
              <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Empresa Alpha Ltda" />
            </div>
            <div>
              <Label>Slug (identificador único)</Label>
              <Input
                className="mt-1"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))}
                placeholder="ex: empresa-alpha"
              />
              <p className="text-xs text-muted-foreground mt-1">Apenas letras minúsculas, números e hifens</p>
            </div>
            <div>
              <Label>Plano</Label>
              <Select value={form.plan} onValueChange={v => setForm(f => ({ ...f, plan: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="essencial">Essencial</SelectItem>
                  <SelectItem value="gestao">Gestão</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => createClient.mutate(form)} disabled={!form.name || !form.slug || createClient.isPending}>
              {createClient.isPending ? "Criando..." : "Criar Cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
