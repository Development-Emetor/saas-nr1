import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Building2, Users, User, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@workspace/auth-web";

const ROLE_LABELS: Record<string, string> = {
  platform_admin: "Admin Plataforma",
  owner: "Proprietário",
  rh: "Recursos Humanos (RH)",
  sst: "SST",
  psicologo: "Psicólogo",
};

const ROLE_COLORS: Record<string, string> = {
  platform_admin: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  owner: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  rh: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  sst: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  psicologo: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
};

export default function OrganizationsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  
  const [unitOpen, setUnitOpen] = useState(false);
  const [workerOpen, setWorkerOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [userEditOpen, setUserEditOpen] = useState(false);
  
  const [unitForm, setUnitForm] = useState({ name: "", description: "" });
  const [workerForm, setWorkerForm] = useState({ displayName: "", email: "", unitId: "", role: "" });
  const [userForm, setUserForm] = useState({ firstName: "", lastName: "", email: "", role: "rh" });
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const { data: units = [] } = useQuery<any[]>({
    queryKey: ["units"],
    queryFn: () => apiRequest("GET", "/organizations/units"),
  });

  const { data: workers = [] } = useQuery<any[]>({
    queryKey: ["workers"],
    queryFn: () => apiRequest("GET", "/organizations/workers"),
  });

  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["users"],
    queryFn: () => apiRequest("GET", "/organizations/users"),
  });

  const createUnit = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/organizations/units", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["units"] }); setUnitOpen(false); setUnitForm({ name: "", description: "" }); toast({ title: "Unidade criada!" }); },
  });

  const createWorker = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/organizations/workers", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workers"] }); setWorkerOpen(false); setWorkerForm({ displayName: "", email: "", unitId: "", role: "" }); toast({ title: "Colaborador adicionado!" }); },
  });

  const createUser = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/organizations/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setUserOpen(false);
      setUserForm({ firstName: "", lastName: "", email: "", role: "rh" });
      toast({ title: "Usuário cadastrado com sucesso!" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao cadastrar usuário", description: err.message || "Tente novamente", variant: "destructive" });
    }
  });

  const editUser = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/organizations/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      setUserEditOpen(false);
      setSelectedUser(null);
      toast({ title: "Usuário atualizado com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar usuário", variant: "destructive" });
    }
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/organizations/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuário removido com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao remover usuário", description: "Verifique se tem permissão ou se está tentando excluir a si mesmo", variant: "destructive" });
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organograma</h1>
        <p className="text-muted-foreground mt-1">Unidades organizacionais e colaboradores</p>
      </div>

      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units">Unidades</TabsTrigger>
          <TabsTrigger value="workers">Colaboradores</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>
 
        <TabsContent value="units" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setUnitOpen(true)}><Plus className="h-3 w-3 mr-1" />Nova Unidade</Button>
          </div>
          {units.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma unidade criada.</p>
              <Button size="sm" className="mt-4" onClick={() => setUnitOpen(true)}>Criar Unidade</Button>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {units.map((u: any) => (
                <Card key={u.id}>
                  <CardContent className="pt-3 pb-3 px-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{u.name}</span>
                    </div>
                    {u.description && <p className="text-xs text-muted-foreground mt-1">{u.description}</p>}
                    <div className="text-xs text-muted-foreground mt-2">
                      {workers.filter(w => w.unitId === u.id).length} colaboradores
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
 
        <TabsContent value="workers" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setWorkerOpen(true)} disabled={units.length === 0}><Plus className="h-3 w-3 mr-1" />Novo Colaborador</Button>
          </div>
          {units.length === 0 && (
            <Card className="border-amber-200 bg-amber-50 mb-4">
              <CardContent className="py-3 px-4 text-sm text-amber-800">
                Crie ao menos uma unidade organizacional antes de adicionar colaboradores.
              </CardContent>
            </Card>
          )}
          {workers.length === 0 ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {workers.map((w: any) => (
                <Card key={w.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-primary">{w.displayName[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{w.displayName}</p>
                          <p className="text-xs text-muted-foreground">{w.unitName} {w.role && `· ${w.role}`}</p>
                        </div>
                      </div>
                      <Badge variant={w.status === "active" ? "default" : "outline"} className="text-xs">
                        {w.status === "active" ? "Ativo" : w.status === "inactive" ? "Inativo" : "Licença"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={() => setUserOpen(true)} disabled={currentUser?.role !== "owner"}>
              <Plus className="h-3 w-3 mr-1" />Novo Usuário
            </Button>
          </div>
          {users.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum usuário cadastrado.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {users.map((u: any) => (
                <Card key={u.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-sm font-semibold text-primary">
                            {u.firstName?.[0]?.toUpperCase() ?? "U"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {u.firstName} {u.lastName}
                            {currentUser?.id === u.id && <span className="text-xs text-muted-foreground ml-1">(você)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={`text-xs font-normal border-none ${ROLE_COLORS[u.role] ?? "bg-slate-100"}`}>
                          {ROLE_LABELS[u.role] ?? u.role}
                        </Badge>
                        {currentUser?.role === "owner" && (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setSelectedUser(u);
                                setUserForm({
                                  firstName: u.firstName ?? "",
                                  lastName: u.lastName ?? "",
                                  email: u.email ?? "",
                                  role: u.role ?? "rh",
                                });
                                setUserEditOpen(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              disabled={currentUser.id === u.id}
                              onClick={() => {
                                if (confirm(`Deseja realmente remover o usuário ${u.firstName}?`)) {
                                  deleteUser.mutate(u.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
 
      <Dialog open={unitOpen} onOpenChange={setUnitOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nova Unidade</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nome</Label><Input value={unitForm.name} onChange={e => setUnitForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Tecnologia, RH, Vendas..." className="mt-1" /></div>
            <div><Label>Descrição</Label><Input value={unitForm.description} onChange={e => setUnitForm(f => ({ ...f, description: e.target.value }))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnitOpen(false)}>Cancelar</Button>
            <Button onClick={() => createUnit.mutate(unitForm)} disabled={!unitForm.name || createUnit.isPending}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
 
      <Dialog open={workerOpen} onOpenChange={setWorkerOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Colaborador</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div><Label>Nome</Label><Input value={workerForm.displayName} onChange={e => setWorkerForm(f => ({ ...f, displayName: e.target.value }))} className="mt-1" /></div>
            <div><Label>Email (opcional)</Label><Input value={workerForm.email} onChange={e => setWorkerForm(f => ({ ...f, email: e.target.value }))} className="mt-1" /></div>
            <div>
              <Label>Unidade</Label>
              <Select value={workerForm.unitId} onValueChange={v => setWorkerForm(f => ({ ...f, unitId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar unidade" /></SelectTrigger>
                <SelectContent>
                  {units.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Cargo</Label><Input value={workerForm.role} onChange={e => setWorkerForm(f => ({ ...f, role: e.target.value }))} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkerOpen(false)}>Cancelar</Button>
            <Button onClick={() => createWorker.mutate({ ...workerForm, unitId: parseInt(workerForm.unitId) })} disabled={!workerForm.displayName || !workerForm.unitId || createWorker.isPending}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={userOpen} onOpenChange={setUserOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Nome</Label>
                <Input value={userForm.firstName} onChange={e => setUserForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Ex: Ana" className="mt-1" />
              </div>
              <div>
                <Label>Sobrenome</Label>
                <Input value={userForm.lastName} onChange={e => setUserForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Ex: Silva" className="mt-1" />
              </div>
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="exemplo@email.com" className="mt-1" />
            </div>
            <div>
              <Label>Perfil de Acesso</Label>
              <Select value={userForm.role} onValueChange={v => setUserForm(f => ({ ...f, role: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Proprietário (Owner)</SelectItem>
                  <SelectItem value="rh">Recursos Humanos (RH)</SelectItem>
                  <SelectItem value="sst">SST</SelectItem>
                  <SelectItem value="psicologo">Psicólogo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserOpen(false)}>Cancelar</Button>
            <Button onClick={() => createUser.mutate(userForm)} disabled={!userForm.firstName || !userForm.email || !userForm.role || createUser.isPending}>
              {createUser.isPending ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={userEditOpen} onOpenChange={setUserEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Nome</Label>
                <Input value={userForm.firstName} onChange={e => setUserForm(f => ({ ...f, firstName: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Sobrenome</Label>
                <Input value={userForm.lastName} onChange={e => setUserForm(f => ({ ...f, lastName: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>E-mail (não editável)</Label>
              <Input value={userForm.email} disabled className="mt-1 bg-muted" />
            </div>
            <div>
              <Label>Perfil de Acesso</Label>
              <Select value={userForm.role} onValueChange={v => setUserForm(f => ({ ...f, role: v }))} disabled={currentUser?.id === selectedUser?.id}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Proprietário (Owner)</SelectItem>
                  <SelectItem value="rh">Recursos Humanos (RH)</SelectItem>
                  <SelectItem value="sst">SST</SelectItem>
                  <SelectItem value="psicologo">Psicólogo</SelectItem>
                </SelectContent>
              </Select>
              {currentUser?.id === selectedUser?.id && (
                <p className="text-xs text-muted-foreground mt-1">Você não pode alterar o seu próprio perfil de acesso.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUserEditOpen(false); setSelectedUser(null); }}>Cancelar</Button>
            <Button onClick={() => editUser.mutate({ id: selectedUser.id, data: { firstName: userForm.firstName, lastName: userForm.lastName, role: userForm.role } })} disabled={!userForm.firstName || editUser.isPending}>
              {editUser.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
