import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Plus, Clock, MapPin, Video, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const MOCK_EVENTS = [
  { id: 1, title: "Devolutiva — Empresa Alpha", date: "2026-06-28", time: "10:00", type: "devolutiva", location: "Online", participants: 8 },
  { id: 2, title: "Entrega GRO — Ciclo Q2", date: "2026-06-30", time: "14:00", type: "entrega", location: "Presencial", participants: 3 },
  { id: 3, title: "Revisão Plano de Ação", date: "2026-07-03", time: "09:00", type: "revisao", location: "Online", participants: 5 },
  { id: 4, title: "Coleta de campo — Unidade Norte", date: "2026-07-07", time: "08:00", type: "coleta", location: "Presencial", participants: 12 },
];

const TYPE_STYLES: Record<string, { label: string; color: string }> = {
  devolutiva: { label: "Devolutiva", color: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200" },
  entrega: { label: "Entrega", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
  revisao: { label: "Revisão", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  coleta: { label: "Coleta", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" },
};

export default function AgendaTecnicaPage() {
  const today = new Date();
  const upcoming = MOCK_EVENTS.filter(e => new Date(e.date) >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = MOCK_EVENTS.filter(e => new Date(e.date) < today);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-[#1B998B]" />
            Agenda Técnica
          </h1>
          <p className="text-muted-foreground mt-1">
            Compromissos técnicos: devolutivas, entregas, coletas e reuniões
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Novo Evento
        </Button>
      </div>

      {/* This Week */}
      <Card className="border-[#1B998B]/30 bg-[#1B998B]/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#1B998B]">Próximos compromissos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum compromisso agendado</p>
          ) : upcoming.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </CardContent>
      </Card>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Histórico</h2>
          <div className="space-y-2 opacity-70">
            {past.map(event => <EventCard key={event.id} event={event} past />)}
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, past = false }: { event: typeof MOCK_EVENTS[0]; past?: boolean }) {
  const typeStyle = TYPE_STYLES[event.type] ?? { label: event.type, color: "bg-slate-100 text-slate-700" };
  const dateObj = new Date(event.date + "T" + event.time);

  return (
    <div className={cn(
      "flex items-start gap-4 p-3 rounded-lg border bg-background",
      past && "grayscale"
    )}>
      <div className="text-center shrink-0 w-12">
        <div className="text-xs text-muted-foreground uppercase">{dateObj.toLocaleDateString("pt-BR", { month: "short" })}</div>
        <div className="text-2xl font-bold leading-tight">{dateObj.getDate()}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{event.title}</div>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />{event.time}
          </span>
          <span className="flex items-center gap-1">
            {event.location === "Online" ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
            {event.location}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />{event.participants} participantes
          </span>
        </div>
      </div>
      <Badge className={cn("text-xs shrink-0", typeStyle.color)} variant="outline">
        {typeStyle.label}
      </Badge>
    </div>
  );
}
