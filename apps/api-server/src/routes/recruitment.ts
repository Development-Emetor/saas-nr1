import { Router } from "express";
import { db, schema } from "../lib/db";
import { eq, and } from "drizzle-orm";
import { requireRole } from "../middlewares/requireAuth";

const router = Router();

// ── JOBS ──────────────────────────────────────────────────────────────────
router.get("/recruitment/jobs", async (req, res) => {
  const { status } = req.query;
  const conditions: ReturnType<typeof eq>[] = [eq(schema.jobsTable.tenantId, req.tenantId!)];
  if (status) conditions.push(eq(schema.jobsTable.status, status as "draft" | "open" | "paused" | "closed"));

  const jobs = await db.query.jobsTable.findMany({
    where: and(...conditions),
    orderBy: (j, { desc }) => [desc(j.createdAt)],
  });

  const jobsWithCounts = await Promise.all(jobs.map(async j => {
    const total = await db.$count(schema.candidatesTable,
      and(eq(schema.candidatesTable.jobId, j.id), eq(schema.candidatesTable.tenantId, req.tenantId!)));
    return { ...formatJob(j), totalCandidates: total };
  }));

  res.json(jobsWithCounts);
});

router.post("/recruitment/jobs", requireRole("rh", "owner"), async (req, res) => {
  const { title, department, description, requirements } = req.body;
  const [job] = await db
    .insert(schema.jobsTable)
    .values({ tenantId: req.tenantId!, title, department, description, requirements })
    .returning();
  res.status(201).json({ ...formatJob(job), totalCandidates: 0 });
});

router.get("/recruitment/jobs/:jobId", async (req, res) => {
  const job = await db.query.jobsTable.findFirst({
    where: and(eq(schema.jobsTable.id, parseInt(String(req.params.jobId))), eq(schema.jobsTable.tenantId, req.tenantId!)),
  });
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  const total = await db.$count(schema.candidatesTable,
    and(eq(schema.candidatesTable.jobId, job.id), eq(schema.candidatesTable.tenantId, req.tenantId!)));
  res.json({ ...formatJob(job), totalCandidates: total });
});

router.patch("/recruitment/jobs/:jobId", requireRole("rh", "owner"), async (req, res) => {
  const { title, department, description, requirements, status } = req.body;
  const [job] = await db
    .update(schema.jobsTable)
    .set({ title, department, description, requirements, status })
    .where(and(eq(schema.jobsTable.id, parseInt(String(req.params.jobId))), eq(schema.jobsTable.tenantId, req.tenantId!)))
    .returning();
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json(formatJob(job));
});

router.delete("/recruitment/jobs/:jobId", requireRole("owner"), async (req, res) => {
  await db.delete(schema.jobsTable)
    .where(and(eq(schema.jobsTable.id, parseInt(String(req.params.jobId))), eq(schema.jobsTable.tenantId, req.tenantId!)));
  res.status(204).send();
});

router.get("/recruitment/jobs/:jobId/candidates", async (req, res) => {
  const jobId = parseInt(String(req.params.jobId));
  const candidates = await db.query.candidatesTable.findMany({
    where: and(eq(schema.candidatesTable.jobId, jobId), eq(schema.candidatesTable.tenantId, req.tenantId!)),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
  res.json(candidates.map(formatCandidateSummary));
});

router.get("/recruitment/jobs/:jobId/pipeline-stats", async (req, res) => {
  const jobId = parseInt(String(req.params.jobId));
  const stages = ["screening", "interview", "offer", "hired", "rejected"] as const;
  const stageCounts = await Promise.all(stages.map(async stage => ({
    stage,
    count: await db.$count(schema.candidatesTable,
      and(eq(schema.candidatesTable.jobId, jobId), eq(schema.candidatesTable.stage, stage), eq(schema.candidatesTable.tenantId, req.tenantId!))
    ),
  })));
  res.json({ jobId, stages: stageCounts });
});

router.get("/recruitment/jobs/:jobId/cultural-fit-config", async (req, res) => {
  const jobId = parseInt(String(req.params.jobId));
  const job = await db.query.jobsTable.findFirst({
    where: and(eq(schema.jobsTable.id, jobId), eq(schema.jobsTable.tenantId, req.tenantId!)),
  });
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json({
    jobId,
    companyValues: job.companyValues,
    requiredCompetencies: job.requiredCompetencies,
    idealPersonaDescription: job.idealPersonaDescription,
    updatedAt: job.updatedAt.toISOString(),
  });
});

router.put("/recruitment/jobs/:jobId/cultural-fit-config", requireRole("owner", "rh"), async (req, res) => {
  const jobId = parseInt(String(req.params.jobId));
  const { companyValues, requiredCompetencies, idealPersonaDescription } = req.body;
  const [job] = await db
    .update(schema.jobsTable)
    .set({ companyValues, requiredCompetencies, idealPersonaDescription })
    .where(and(eq(schema.jobsTable.id, jobId), eq(schema.jobsTable.tenantId, req.tenantId!)))
    .returning();
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json({
    jobId,
    companyValues: job.companyValues,
    requiredCompetencies: job.requiredCompetencies,
    idealPersonaDescription: job.idealPersonaDescription,
    updatedAt: job.updatedAt.toISOString(),
  });
});

router.post("/recruitment/jobs/:jobId/compare-candidates", requireRole("rh", "owner"), async (req, res) => {
  const jobId = parseInt(String(req.params.jobId));
  const { candidateIds } = req.body;

  const candidates = await db.query.candidatesTable.findMany({
    where: eq(schema.candidatesTable.tenantId, req.tenantId!),
  });

  const selected = candidates.filter((c: typeof schema.candidatesTable.$inferSelect) => (candidateIds as number[]).includes(c.id));
  const job = await db.query.jobsTable.findFirst({
    where: and(eq(schema.jobsTable.id, jobId), eq(schema.jobsTable.tenantId, req.tenantId!)),
  });
  const dimensions = job?.requiredCompetencies?.length ? job.requiredCompetencies : ["Liderança", "Comunicação", "Técnico", "Cultural", "Iniciativa"];

  res.json({
    jobId,
    candidates: selected.map((c: typeof schema.candidatesTable.$inferSelect) => ({
      id: c.id,
      name: c.name,
      fitScore: c.fitScore ?? null,
      dimensions: (c.fitDimensions as Record<string, number>) ?? null,
    })),
    dimensions,
  });
});

// ── CANDIDATES ────────────────────────────────────────────────────────────
router.get("/recruitment/candidates", async (req, res) => {
  const { folderId } = req.query;

  if (folderId) {
    const folderCandidates = await db
      .select({ candidateId: schema.folderCandidatesTable.candidateId })
      .from(schema.folderCandidatesTable)
      .where(and(
        eq(schema.folderCandidatesTable.folderId, parseInt(folderId as string)),
        eq(schema.folderCandidatesTable.tenantId, req.tenantId!)
      ));
    const ids = folderCandidates.map(fc => fc.candidateId);
    if (!ids.length) { res.json([]); return; }

    const candidates = await Promise.all(ids.map(id =>
      db.query.candidatesTable.findFirst({
        where: and(eq(schema.candidatesTable.id, id), eq(schema.candidatesTable.tenantId, req.tenantId!)),
      })
    ));
    res.json(candidates.filter(Boolean).map(c => formatCandidateSummary(c!)));
    return;
  }

  const candidates = await db.query.candidatesTable.findMany({
    where: eq(schema.candidatesTable.tenantId, req.tenantId!),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
  res.json(candidates.map(formatCandidateSummary));
});

router.post("/recruitment/candidates", requireRole("rh", "owner"), async (req, res) => {
  const { name, email, phone, jobId, cvText, linkedinUrl, githubUrl, portfolioUrl, notes } = req.body;
  if (jobId != null) {
    const job = await db.query.jobsTable.findFirst({
      where: and(eq(schema.jobsTable.id, jobId), eq(schema.jobsTable.tenantId, req.tenantId!)),
    });
    if (!job) { res.status(400).json({ error: "Vaga não encontrada ou não pertence a esta empresa" }); return; }
  }
  const [candidate] = await db
    .insert(schema.candidatesTable)
    .values({ tenantId: req.tenantId!, name, email, phone, jobId, cvText, linkedinUrl, githubUrl, portfolioUrl, notes })
    .returning();
  res.status(201).json(formatCandidate(candidate));
});

router.get("/recruitment/candidates/:candidateId", async (req, res) => {
  const candidate = await db.query.candidatesTable.findFirst({
    where: and(eq(schema.candidatesTable.id, parseInt(String(req.params.candidateId))), eq(schema.candidatesTable.tenantId, req.tenantId!)),
  });
  if (!candidate) { res.status(404).json({ error: "Candidate not found" }); return; }

  const job = candidate.jobId
    ? await db.query.jobsTable.findFirst({
        where: and(eq(schema.jobsTable.id, candidate.jobId), eq(schema.jobsTable.tenantId, req.tenantId!)),
      })
    : null;

  res.json({ ...formatCandidate(candidate), jobTitle: job?.title ?? null });
});

router.patch("/recruitment/candidates/:candidateId", requireRole("rh", "owner"), async (req, res) => {
  const { name, email, phone, cvText, linkedinUrl, notes } = req.body;
  const [candidate] = await db
    .update(schema.candidatesTable)
    .set({ name, email, phone, cvText, linkedinUrl, notes })
    .where(and(eq(schema.candidatesTable.id, parseInt(String(req.params.candidateId))), eq(schema.candidatesTable.tenantId, req.tenantId!)))
    .returning();
  if (!candidate) { res.status(404).json({ error: "Candidate not found" }); return; }
  res.json(formatCandidate(candidate));
});

router.post("/recruitment/candidates/:candidateId/move-stage", requireRole("rh", "owner"), async (req, res) => {
  const { stage, note } = req.body;
  const candidateId = parseInt(String(req.params.candidateId));
  const existing = await db.query.candidatesTable.findFirst({
    where: and(eq(schema.candidatesTable.id, candidateId), eq(schema.candidatesTable.tenantId, req.tenantId!)),
  });
  if (!existing) { res.status(404).json({ error: "Candidate not found" }); return; }

  const history = (existing.stageHistory as { stage: string; note?: string; movedAt: string }[]) || [];
  history.push({ stage: stage as string, note: note as string | undefined, movedAt: new Date().toISOString() });

  const [candidate] = await db
    .update(schema.candidatesTable)
    .set({ stage, stageHistory: history })
    .where(and(eq(schema.candidatesTable.id, candidateId), eq(schema.candidatesTable.tenantId, req.tenantId!)))
    .returning();
  res.json(formatCandidate(candidate));
});

// ── FOLDERS ───────────────────────────────────────────────────────────────
router.get("/recruitment/folders", async (req, res) => {
  const folders = await db.query.foldersTable.findMany({
    where: eq(schema.foldersTable.tenantId, req.tenantId!),
    orderBy: (f, { asc }) => [asc(f.name)],
  });
  const withCounts = await Promise.all(folders.map(async f => ({
    ...formatFolder(f),
    candidateCount: await db.$count(schema.folderCandidatesTable,
      and(eq(schema.folderCandidatesTable.folderId, f.id), eq(schema.folderCandidatesTable.tenantId, req.tenantId!))
    ),
  })));
  res.json(withCounts);
});

router.post("/recruitment/folders", requireRole("rh", "owner"), async (req, res) => {
  const { name, department, description } = req.body;
  const [folder] = await db
    .insert(schema.foldersTable)
    .values({ tenantId: req.tenantId!, name, department, description })
    .returning();
  res.status(201).json({ ...formatFolder(folder), candidateCount: 0 });
});

router.patch("/recruitment/folders/:folderId", requireRole("rh", "owner"), async (req, res) => {
  const { name, department, description } = req.body;
  const [folder] = await db
    .update(schema.foldersTable)
    .set({ name, department, description })
    .where(and(eq(schema.foldersTable.id, parseInt(String(req.params.folderId))), eq(schema.foldersTable.tenantId, req.tenantId!)))
    .returning();
  if (!folder) { res.status(404).json({ error: "Folder not found" }); return; }
  res.json(formatFolder(folder));
});

router.delete("/recruitment/folders/:folderId", requireRole("owner"), async (req, res) => {
  await db.delete(schema.foldersTable)
    .where(and(eq(schema.foldersTable.id, parseInt(String(req.params.folderId))), eq(schema.foldersTable.tenantId, req.tenantId!)));
  res.status(204).send();
});

router.get("/recruitment/folders/:folderId/candidates", async (req, res) => {
  const folderId = parseInt(String(req.params.folderId));
  const links = await db.query.folderCandidatesTable.findMany({
    where: and(eq(schema.folderCandidatesTable.folderId, folderId), eq(schema.folderCandidatesTable.tenantId, req.tenantId!)),
  });
  const candidates = await Promise.all(links.map(l =>
    db.query.candidatesTable.findFirst({
      where: and(eq(schema.candidatesTable.id, l.candidateId), eq(schema.candidatesTable.tenantId, req.tenantId!)),
    })
  ));
  res.json(candidates.filter(Boolean).map(c => formatCandidateSummary(c!)));
});

router.post("/recruitment/folders/:folderId/candidates", requireRole("rh", "owner"), async (req, res) => {
  const folderId = parseInt(String(req.params.folderId));
  const { candidateId } = req.body;

  const [folder, candidate] = await Promise.all([
    db.query.foldersTable.findFirst({
      where: and(eq(schema.foldersTable.id, folderId), eq(schema.foldersTable.tenantId, req.tenantId!)),
    }),
    db.query.candidatesTable.findFirst({
      where: and(eq(schema.candidatesTable.id, candidateId), eq(schema.candidatesTable.tenantId, req.tenantId!)),
    }),
  ]);
  if (!folder) { res.status(404).json({ error: "Pasta não encontrada" }); return; }
  if (!candidate) { res.status(404).json({ error: "Candidato não encontrado" }); return; }

  await db.insert(schema.folderCandidatesTable)
    .values({ folderId, candidateId, tenantId: req.tenantId! })
    .onConflictDoNothing();
  res.status(201).json({ ok: true });
});

// ── AI ────────────────────────────────────────────────────────────────────
router.post("/recruitment/candidates/:candidateId/analyze", requireRole("rh", "owner"), async (req, res) => {
  const candidateId = parseInt(String(req.params.candidateId));
  const { jobId } = req.body as { jobId?: number };

  const [candidate, job] = await Promise.all([
    db.query.candidatesTable.findFirst({
      where: and(eq(schema.candidatesTable.id, candidateId), eq(schema.candidatesTable.tenantId, req.tenantId!)),
    }),
    jobId
      ? db.query.jobsTable.findFirst({
          where: and(eq(schema.jobsTable.id, jobId), eq(schema.jobsTable.tenantId, req.tenantId!)),
        })
      : Promise.resolve(null),
  ]);

  if (!candidate) { res.status(404).json({ error: "Candidate not found" }); return; }

  try {
    const { anthropic } = await import("@workspace/integrations-anthropic-ai");
    const prompt = `Analise o perfil deste candidato para a vaga indicada e retorne um JSON estruturado.

CANDIDATO:
Nome: ${candidate.name}
CV/Experiência: ${candidate.cvText ?? "Não fornecido"}
LinkedIn: ${candidate.linkedinUrl ?? "Não fornecido"}
Habilidades: ${(candidate.skills as string[] | null)?.join(", ") || "Não listadas"}

VAGA:
Título: ${job?.title ?? "Não especificada"}
Descrição: ${job?.description ?? ""}
Requisitos: ${job?.requirements ?? ""}
Valores da empresa: ${job?.companyValues?.join(", ") ?? ""}
Competências necessárias: ${job?.requiredCompetencies?.join(", ") ?? ""}

Retorne APENAS um JSON válido (sem markdown) com esta estrutura exata:
{
  "fitScore": <0-100>,
  "fitJustification": "<justificativa em português>",
  "fitDimensions": {"Técnico": <0-100>, "Cultural": <0-100>, "Liderança": <0-100>, "Comunicação": <0-100>, "Iniciativa": <0-100>},
  "strengths": ["<ponto forte 1>", "<ponto forte 2>", "<ponto forte 3>"],
  "attentionPoints": ["<ponto de atenção 1>", "<ponto de atenção 2>"],
  "suggestedInterviewQuestions": ["<pergunta 1>", "<pergunta 2>", "<pergunta 3>"]
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    const text = block.type === "text" ? block.text : "{}";
    const analysis = JSON.parse(text.replace(/```json\n?|\n?```/g, "").trim()) as {
      fitScore: number;
      fitJustification: string;
      fitDimensions: Record<string, number>;
      strengths: string[];
      attentionPoints: string[];
      suggestedInterviewQuestions: string[];
    };

    await db.update(schema.candidatesTable)
      .set({
        fitScore: analysis.fitScore,
        fitJustification: analysis.fitJustification,
        fitDimensions: analysis.fitDimensions,
      })
      .where(and(eq(schema.candidatesTable.id, candidateId), eq(schema.candidatesTable.tenantId, req.tenantId!)));

    res.json({
      candidateId,
      fitScore: analysis.fitScore,
      fitJustification: analysis.fitJustification,
      fitDimensions: analysis.fitDimensions,
      strengths: analysis.strengths,
      attentionPoints: analysis.attentionPoints,
      suggestedInterviewQuestions: analysis.suggestedInterviewQuestions,
      disclaimer: "Análise gerada por IA. Não substitui avaliação humana especializada.",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Serviço IA indisponível";
    res.status(503).json({
      error: "Análise IA indisponível",
      detail: msg,
      action: "Revise o perfil do candidato manualmente antes de tomar decisões de contratação.",
    });
  }
});

// ── HELPERS ────────────────────────────────────────────────────────────────
function formatJob(j: typeof schema.jobsTable.$inferSelect) {
  return {
    id: j.id,
    title: j.title,
    department: j.department,
    description: j.description,
    requirements: j.requirements,
    status: j.status,
    tenantId: j.tenantId,
    createdAt: j.createdAt.toISOString(),
  };
}

function formatCandidateSummary(c: typeof schema.candidatesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    jobId: c.jobId,
    stage: c.stage,
    fitScore: c.fitScore,
    createdAt: c.createdAt.toISOString(),
  };
}

function formatCandidate(c: typeof schema.candidatesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    jobId: c.jobId,
    stage: c.stage,
    cvText: c.cvText,
    linkedinUrl: c.linkedinUrl,
    githubUrl: c.githubUrl,
    portfolioUrl: c.portfolioUrl,
    skills: c.skills,
    experience: c.experience,
    education: c.education,
    fitScore: c.fitScore,
    fitJustification: c.fitJustification,
    fitDimensions: c.fitDimensions as Record<string, number> | null,
    notes: c.notes,
    stageHistory: c.stageHistory,
    createdAt: c.createdAt.toISOString(),
  };
}

function formatFolder(f: typeof schema.foldersTable.$inferSelect) {
  return {
    id: f.id,
    name: f.name,
    department: f.department,
    description: f.description,
    tenantId: f.tenantId,
    createdAt: f.createdAt.toISOString(),
  };
}

export default router;
