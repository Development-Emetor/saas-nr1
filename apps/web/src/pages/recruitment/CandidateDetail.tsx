import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Loader2, ExternalLink, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip
} from "recharts";

const stageLabel: Record<string, string> = {
  screening: "Triagem", interview: "Entrevista", offer: "Proposta", hired: "Contratado", rejected: "Reprovado"
};

export default function CandidateDetail() {
  const { id } = useParams<{ id: string }>();
  const candidateId = parseInt(id!);
  const qc = useQueryClient();
  const { toast } = useToast();
  const [analyzing, setAnalyzing] = useState(false);

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["candidate", candidateId],
    queryFn: () => apiRequest<any>("GET", `/recruitment/candidates/${candidateId}`),
  });

  const { data: jobs = [] } = useQuery<any[]>({
    queryKey: ["jobs"],
    queryFn: () => apiRequest("GET", "/recruitment/jobs"),
  });

  const moveStageMutation = useMutation({
    mutationFn: (stage: string) => apiRequest("POST", `/recruitment/candidates/${candidateId}/move-stage`, { stage }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["candidate", candidateId] }),
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      setAnalyzing(true);
      return apiRequest("POST", `/recruitment/candidates/${candidateId}/analyze`, { jobId: candidate?.jobId });
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ["candidate", candidateId] });
      toast({ title: `Análise concluída! Fit Score: ${data.fitScore}%` });
      setAnalyzing(false);
    },
    onError: () => setAnalyzing(false),
  });

  if (isLoading) return <div className="h-64 bg-muted animate-pulse rounded-lg" />;
  if (!candidate) return <div className="text-center py-20 text-muted-foreground">Candidato não encontrado.</div>;

  const radarData = candidate.fitDimensions
    ? Object.entries(candidate.fitDimensions).map(([k, v]) => ({ dimension: k, valor: v as number }))
    : [];

  const stages = ["screening", "interview", "offer", "hired", "rejected"] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/recruitment/candidates">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{candidate.name}</h1>
          <div className="flex gap-2 mt-1 flex-wrap">
            <Badge>{stageLabel[candidate.stage]}</Badge>
            {candidate.jobTitle && <Badge variant="outline">{candidate.jobTitle}</Badge>}
          </div>
        </div>
        <Button onClick={() => analyzeMutation.mutate()} disabled={analyzing}>
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Star className="h-4 w-4 mr-2" />}
          {analyzing ? "Analisando..." : "Analisar com IA"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fit Score */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Fit Cultural</CardTitle></CardHeader>
          <CardContent>
            {candidate.fitScore != null ? (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-5xl font-bold text-secondary">{Math.round(candidate.fitScore)}%</div>
                  <div className="text-sm text-muted-foreground mt-1">Score de Fit</div>
                </div>
                {radarData.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="dimension" className="text-xs" />
                      <Radar dataKey="valor" stroke="#1B998B" fill="#1B998B" fillOpacity={0.3} />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
                {candidate.fitJustification && (
                  <p className="text-xs text-muted-foreground border-t pt-3">{candidate.fitJustification}</p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Clique em "Analisar com IA" para calcular o fit cultural</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Informações</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {candidate.email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{candidate.email}</span></div>}
              {candidate.phone && <div className="flex justify-between"><span className="text-muted-foreground">Telefone</span><span>{candidate.phone}</span></div>}
              {candidate.linkedinUrl && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LinkedIn</span>
                  <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    Ver perfil <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pipeline Stage */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Pipeline</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stages.map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant={candidate.stage === s ? "default" : "outline"}
                    onClick={() => candidate.stage !== s && moveStageMutation.mutate(s)}
                    disabled={candidate.stage === s}
                  >
                    {stageLabel[s]}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CV */}
      {candidate.cvText && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Currículo / Perfil</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{candidate.cvText}</pre>
          </CardContent>
        </Card>
      )}

      {/* AI Disclaimer */}
      {candidate.fitScore != null && (
        <div className="flex gap-2 text-xs text-muted-foreground border rounded-lg p-3 bg-muted/30">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Análise gerada por inteligência artificial. Não substitui avaliação humana especializada. Use como suporte à decisão.</span>
        </div>
      )}
    </div>
  );
}
