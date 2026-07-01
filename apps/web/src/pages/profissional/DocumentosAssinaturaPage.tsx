import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, PenLine, Download, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DocumentosAssinaturaPage() {
  const { data: campaigns = [] } = useQuery<any[]>({
    queryKey: ["campaigns"],
    queryFn: () => apiRequest("GET", "/nr1/campaigns"),
  });

  const campaignIds = campaigns.map((c: any) => c.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <PenLine className="h-6 w-6 text-[#0F4C75]" />
          Documentos & Assinatura
        </h1>
        <p className="text-muted-foreground mt-1">
          Documentos técnicos pendentes de revisão e assinatura com CRP validado
        </p>
      </div>

      {/* Pending Signature Banner */}
      <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950">
        <CardContent className="pt-4 pb-4 px-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-200">Assinatura digital</div>
              <div className="text-sm text-amber-700 dark:text-amber-300">
                A assinatura de documentos psicológicos exige validação de CRP ativo. 
                Apenas o psicólogo responsável vinculado à campanha pode assinar.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Status Sections */}
      {[
        { label: "Aguardando Assinatura", status: "pending_signature", icon: <Clock className="h-4 w-4 text-amber-500" /> },
        { label: "Documentos Assinados", status: "signed", icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
        { label: "Rascunhos", status: "draft", icon: <FileText className="h-4 w-4 text-slate-400" /> },
      ].map(section => (
        <div key={section.status}>
          <div className="flex items-center gap-2 mb-3">
            {section.icon}
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{section.label}</h2>
          </div>
          {campaigns.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-6 text-center text-muted-foreground text-sm">
                Nenhum documento {section.status === "signed" ? "assinado" : section.status === "draft" ? "em rascunho" : "pendente"}
              </CardContent>
            </Card>
          ) : (
            campaigns.map(campaign => (
              <DocumentsForCampaign key={campaign.id} campaign={campaign} filterStatus={section.status} />
            ))
          )}
        </div>
      ))}
    </div>
  );
}

function DocumentsForCampaign({ campaign, filterStatus }: { campaign: any; filterStatus: string }) {
  const { data: docs = [] } = useQuery<any[]>({
    queryKey: ["documents", campaign.id],
    queryFn: () => apiRequest("GET", `/nr1/campaigns/${campaign.id}/documents`),
  });

  const filtered = docs.filter((d: any) => d.status === filterStatus);
  if (filtered.length === 0) return null;

  return (
    <div className="space-y-2 mb-3">
      {filtered.map((doc: any) => (
        <Card key={doc.id} className="hover:shadow-sm transition-shadow">
          <CardContent className="pt-3 pb-3 px-4">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-blue-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{doc.title}</div>
                <div className="text-xs text-muted-foreground">
                  {campaign.title} · Versão {doc.version ?? "1.0"} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {filterStatus === "pending_signature" && (
                  <Button size="sm" className="bg-[#0F4C75] hover:bg-[#0F4C75]/90">
                    <PenLine className="h-3.5 w-3.5 mr-1" /> Assinar
                  </Button>
                )}
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
