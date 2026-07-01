import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle, Users, Briefcase, CheckCircle2,
  TrendingUp, FileText, ClipboardList, Star
} from "lucide-react";
import { Link } from "wouter";

interface DashboardSummary {
  nr1: {
    activeCampaigns: number;
    avgParticipation: number;
    openActions: number;
    criticalRisks: number;
    documentsAwaitingSignature: number;
  };
  recruitment: {
    openJobs: number;
    totalCandidates: number;
    avgFitScore: number;
    candidatesThisMonth: number;
  };
}

export default function Dashboard() {
  const { data, isLoading } = useQuery<DashboardSummary>({
    queryKey: ["dashboard"],
    queryFn: () => apiRequest("GET", "/dashboard/summary"),
  });

  if (isLoading) return <DashboardSkeleton />;

  const nr1 = data?.nr1;
  const rec = data?.recruitment;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel Executivo</h1>
        <p className="text-muted-foreground mt-1">Visão consolidada de NR-1 e Recrutamento</p>
      </div>

      {/* NR-1 Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-6 rounded bg-primary" />
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Módulo NR-1 Psicossocial
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<ClipboardList className="h-5 w-5 text-primary" />}
            label="Campanhas Ativas"
            value={nr1?.activeCampaigns ?? 0}
            href="/nr1"
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5 text-secondary" />}
            label="Participação Média"
            value={`${nr1?.avgParticipation ?? 0}%`}
            trend="green"
          />
          <MetricCard
            icon={<CheckCircle2 className="h-5 w-5 text-accent" />}
            label="Ações em Aberto"
            value={nr1?.openActions ?? 0}
            href="/nr1/actions"
          />
          <MetricCard
            icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
            label="Riscos Críticos"
            value={nr1?.criticalRisks ?? 0}
            trend={nr1?.criticalRisks ? "red" : "green"}
          />
        </div>
      </section>

      {/* Recruitment Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-1 w-6 rounded bg-secondary" />
          <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
            Módulo Recrutamento IA
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            icon={<Briefcase className="h-5 w-5 text-secondary" />}
            label="Vagas Abertas"
            value={rec?.openJobs ?? 0}
            href="/recruitment/jobs"
          />
          <MetricCard
            icon={<Users className="h-5 w-5 text-primary" />}
            label="Total Candidatos"
            value={rec?.totalCandidates ?? 0}
            href="/recruitment/candidates"
          />
          <MetricCard
            icon={<Star className="h-5 w-5 text-accent" />}
            label="Fit Score Médio"
            value={`${Math.round(rec?.avgFitScore ?? 0)}%`}
            trend={rec?.avgFitScore && rec.avgFitScore >= 70 ? "green" : "neutral"}
          />
          <MetricCard
            icon={<TrendingUp className="h-5 w-5 text-secondary" />}
            label="Candidatos/Mês"
            value={rec?.candidatesThisMonth ?? 0}
          />
        </div>
      </section>

      {/* Quick links */}
      <section>
        <h2 className="font-semibold mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickLink
            href="/nr1"
            title="Nova Campanha NR-1"
            description="Inicie uma nova pesquisa de riscos psicossociais"
            icon={<ClipboardList className="h-6 w-6 text-primary" />}
          />
          <QuickLink
            href="/recruitment/jobs"
            title="Publicar Vaga"
            description="Crie uma vaga e configure análise de fit cultural"
            icon={<Briefcase className="h-6 w-6 text-secondary" />}
          />
          <QuickLink
            href="/recruitment/candidates"
            title="Analisar Candidato"
            description="Análise IA de perfil com pontuação de fit cultural"
            icon={<Star className="h-6 w-6 text-accent" />}
          />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, href, trend }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href?: string;
  trend?: "green" | "red" | "neutral";
}) {
  const trendColor = trend === "green" ? "text-green-600" : trend === "red" ? "text-destructive" : "";
  const inner = (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="pt-4 pb-4 px-4">
        <div className="flex items-center justify-between mb-2">
          {icon}
          {trend === "green" && <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">ok</Badge>}
          {trend === "red" && <Badge variant="destructive" className="text-xs">atenção</Badge>}
        </div>
        <div className={`text-2xl font-bold ${trendColor}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function QuickLink({ href, title, description, icon }: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed hover:border-solid hover:border-primary/40">
        <CardContent className="pt-4 pb-4 px-4 flex gap-3">
          <div className="mt-0.5">{icon}</div>
          <div>
            <div className="font-medium text-sm">{title}</div>
            <div className="text-xs text-muted-foreground mt-1">{description}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="h-8 bg-muted animate-pulse rounded w-48" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}
