import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Building2, Users, ClipboardList, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function CarteiraPsicologoPage() {
  const { data: campaigns = [], isLoading } = useQuery<any[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiRequest("GET", "/nr1/campaigns"),
  });

  const active = campaigns.filter(c => c.status === "published");
  const analyzing = campaigns.filter(c => c.status === "analyzing");
  const closed = campaigns.filter(c => c.status === "closed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-[#1B998B]" />
          Carteira de Empresas
        </h1>
        <p className="text-muted-foreground mt-1">
          Visão consolidada das empresas e campanhas sob sua responsabilidade técnica
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Em Andamento", count: active.length, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
          { label: "Analisando", count: analyzing.length, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950" },
          { label: "Encerradas", count: closed.length, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-900" },
        ].map(s => (
          <Card key={s.label} className={s.bg}>
            <CardContent className="pt-4 pb-4 px-4">
              <div className="text-3xl font-bold">{s.count}</div>
              <div className={`text-sm font-medium mt-1 ${s.color}`}>{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign list */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)}</div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma empresa na carteira</p>
            <p className="text-sm mt-1">As campanhas NR-1 nas quais você é psicólogo responsável aparecerão aqui</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Campanhas Ativas</h2>
          {campaigns.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-[#0F4C75]/10 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-5 w-5 text-[#0F4C75]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.title}</span>
                      <Badge variant={c.status === "published" ? "default" : "secondary"} className="text-xs">
                        {c.status === "published" ? "Em Andamento" : c.status === "analyzing" ? "Analisando" : c.status === "closed" ? "Encerrada" : "Rascunho"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex gap-3">
                      <span><Users className="h-3 w-3 inline mr-1" />{c.totalResponded}/{c.totalInvited} respondentes</span>
                      {c.participationRate != null && <span>{c.participationRate}% participação</span>}
                    </div>
                  </div>
                  <Link href={`/nr1/${c.id}`}>
                    <Button variant="ghost" size="sm">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
