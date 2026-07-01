import { Router } from "express";
import { db, schema } from "../lib/db";
import { eq, and, sql, ne } from "drizzle-orm";
import { computeRiskLevel } from "../lib/riskLevel";
import { randomBytes } from "crypto";
import { requireRole } from "../middlewares/requireAuth";

const router = Router();

// ── CAMPAIGNS ──────────────────────────────────────────────────────────────
router.get("/nr1/campaigns", async (req, res) => {
  const campaigns = await db.query.campaignsTable.findMany({
    where: eq(schema.campaignsTable.tenantId, req.tenantId!),
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
  res.json(campaigns.map(formatCampaign));
});

router.post("/nr1/campaigns", requireRole("owner", "sst"), async (req, res) => {
  const { title, description, instrumentType, targetUnitIds, privacyThreshold, startDate, endDate } = req.body;
  const [campaign] = await db
    .insert(schema.campaignsTable)
    .values({
      tenantId: req.tenantId!,
      title,
      description,
      instrumentType: instrumentType || "demand_control",
      targetUnitIds: targetUnitIds || [],
      privacyThreshold: privacyThreshold || 7,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    })
    .returning();
  res.status(201).json(formatCampaign(campaign));
});

router.get("/nr1/campaigns/:campaignId", async (req, res) => {
  const campaign = await findCampaign(req.tenantId!, parseInt(String(req.params.campaignId)));
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  res.json(formatCampaign(campaign));
});

router.patch("/nr1/campaigns/:campaignId", requireRole("owner", "sst"), async (req, res) => {
  const { title, description, endDate } = req.body;
  const [campaign] = await db
    .update(schema.campaignsTable)
    .set({ title, description, endDate: endDate ? new Date(endDate) : undefined })
    .where(and(eq(schema.campaignsTable.id, parseInt(String(req.params.campaignId))), eq(schema.campaignsTable.tenantId, req.tenantId!)))
    .returning();
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  res.json(formatCampaign(campaign));
});

router.post(
  "/nr1/campaigns/:campaignId/publish",
  requireRole("owner", "sst", "psicologo"),
  async (req, res) => {
    const campaignId = parseInt(String(req.params.campaignId), 10);

    // RN-010: high/critical risks must have at least one action that is not "pending".
    const highRisks = await db.query.riskFactorsTable.findMany({
      where: and(
        eq(schema.riskFactorsTable.campaignId, campaignId),
        eq(schema.riskFactorsTable.tenantId, req.tenantId!),
      ),
    });
    const criticalWithoutActions = await Promise.all(
      highRisks
        .filter((f) => f.level === "critical" || f.level === "high")
        .map(async (f) => {
          const count = await db.$count(schema.actionsTable, and(
            eq(schema.actionsTable.riskFactorId, f.id),
            eq(schema.actionsTable.tenantId, req.tenantId!),
            ne(schema.actionsTable.status, "pending"),
          ));
          return count === 0 ? f.title : null;
        }),
    );
    const blockers = criticalWithoutActions.filter(Boolean);
    if (blockers.length > 0) {
      res.status(422).json({
        error: "Fatores de risco alto/crítico sem plano de ação iniciado (RN-010)",
        blockers,
      });
      return;
    }

    const [campaign] = await db
      .update(schema.campaignsTable)
      .set({ status: "published", startDate: new Date() })
      .where(and(
        eq(schema.campaignsTable.id, campaignId),
        eq(schema.campaignsTable.tenantId, req.tenantId!),
      ))
      .returning();
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
    res.json(formatCampaign(campaign));
  },
);

router.post("/nr1/campaigns/:campaignId/close", requireRole("owner", "sst"), async (req, res) => {
  const [campaign] = await db
    .update(schema.campaignsTable)
    .set({ status: "closed", endDate: new Date() })
    .where(and(eq(schema.campaignsTable.id, parseInt(String(req.params.campaignId))), eq(schema.campaignsTable.tenantId, req.tenantId!)))
    .returning();
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  res.json(formatCampaign(campaign));
});

router.get("/nr1/campaigns/:campaignId/stats", async (req, res) => {
  const campaignId = parseInt(String(req.params.campaignId));
  const campaign = await findCampaign(req.tenantId!, campaignId);
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

  const responses = await db.query.responsesTable.findMany({
    where: and(eq(schema.responsesTable.campaignId, campaignId), eq(schema.responsesTable.tenantId, req.tenantId!)),
  });

  const rate = campaign.totalInvited > 0 ? responses.length / campaign.totalInvited : 0;
  res.json({
    totalInvited: campaign.totalInvited,
    totalResponded: responses.length,
    participationRate: Math.round(rate * 100),
    belowThreshold: responses.length < (campaign.privacyThreshold || 7),
    byUnit: [],
  });
});

// ── RESPONSES ─────────────────────────────────────────────────────────────
router.post("/nr1/campaigns/:campaignId/respond", async (req, res) => {
  const campaignId = parseInt(String(req.params.campaignId));
  const { answers } = req.body;

  const campaign = await findCampaign(req.tenantId!, campaignId);
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
  if (campaign.status !== "published") { res.status(400).json({ error: "Campaign not accepting responses" }); return; }

  const pseudoId = randomBytes(16).toString("hex");
  await db.insert(schema.responsesTable).values({
    tenantId: req.tenantId!,
    campaignId,
    pseudoRespondentId: pseudoId,
    answers,
  });

  await db
    .update(schema.campaignsTable)
    .set({ totalResponded: sql`${schema.campaignsTable.totalResponded} + 1` })
    .where(eq(schema.campaignsTable.id, campaignId));

  res.status(201).json({ ok: true });
});

router.get("/nr1/campaigns/:campaignId/aggregate", async (req, res) => {
  const campaignId = parseInt(String(req.params.campaignId));
  const campaign = await findCampaign(req.tenantId!, campaignId);
  if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

  const responses = await db.query.responsesTable.findMany({
    where: and(eq(schema.responsesTable.campaignId, campaignId), eq(schema.responsesTable.tenantId, req.tenantId!)),
  });

  const threshold = campaign.privacyThreshold || 7;
  const belowThreshold = responses.length < threshold;

  if (belowThreshold) {
    res.json({ campaignId, sampleSize: responses.length, belowThreshold: true, dimensions: [] });
    return;
  }

  const dimensionTotals: Record<string, number[]> = {};
  for (const r of responses) {
    const answers = r.answers as Record<string, number>;
    for (const [key, val] of Object.entries(answers)) {
      if (typeof val === "number") {
        if (!dimensionTotals[key]) dimensionTotals[key] = [];
        dimensionTotals[key].push(val);
      }
    }
  }

  const dimensions = Object.entries(dimensionTotals).map(([key, vals]) => ({
    key,
    label: key,
    average: vals.reduce((a, b) => a + b, 0) / vals.length,
    distribution: {},
  }));

  res.json({ campaignId, sampleSize: responses.length, belowThreshold: false, dimensions });
});

// ── RISK FACTORS ──────────────────────────────────────────────────────────
router.get("/nr1/campaigns/:campaignId/risk-factors", async (req, res) => {
  const campaignId = parseInt(String(req.params.campaignId));
  const factors = await db.query.riskFactorsTable.findMany({
    where: and(eq(schema.riskFactorsTable.campaignId, campaignId), eq(schema.riskFactorsTable.tenantId, req.tenantId!)),
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
  res.json(factors.map(formatRiskFactor));
});

router.post("/nr1/campaigns/:campaignId/risk-factors", requireRole("sst", "psicologo", "owner"), async (req, res) => {
  const campaignId = parseInt(String(req.params.campaignId));
  const { title, description, probability, severity, exposedGroups, existingControls } = req.body;
  const level = computeRiskLevel(probability, severity);
  const [factor] = await db
    .insert(schema.riskFactorsTable)
    .values({ tenantId: req.tenantId!, campaignId, title, description, probability, severity, level, exposedGroups, existingControls })
    .returning();
  res.status(201).json(formatRiskFactor(factor));
});

router.patch("/nr1/risk-factors/:riskFactorId", requireRole("sst", "psicologo", "owner"), async (req, res) => {
  const riskFactorId = parseInt(String(req.params.riskFactorId));
  const updates: Record<string, unknown> = { ...req.body };
  type RiskScale = "very_low" | "low" | "medium" | "high" | "very_high";
  if (updates.probability && updates.severity) {
    updates.level = computeRiskLevel(updates.probability as RiskScale, updates.severity as RiskScale);
  }
  const [factor] = await db
    .update(schema.riskFactorsTable)
    .set(updates)
    .where(and(eq(schema.riskFactorsTable.id, riskFactorId), eq(schema.riskFactorsTable.tenantId, req.tenantId!)))
    .returning();
  if (!factor) { res.status(404).json({ error: "Risk factor not found" }); return; }
  res.json(formatRiskFactor(factor));
});

router.get("/nr1/campaigns/:campaignId/risk-matrix", async (req, res) => {
  const campaignId = parseInt(String(req.params.campaignId));
  const factors = await db.query.riskFactorsTable.findMany({
    where: and(eq(schema.riskFactorsTable.campaignId, campaignId), eq(schema.riskFactorsTable.tenantId, req.tenantId!)),
  });
  const summary = { critical: 0, high: 0, moderate: 0, low: 0 };
  for (const f of factors) summary[f.level as keyof typeof summary]++;
  res.json({ campaignId, factors: factors.map(formatRiskFactor), summary });
});

router.post("/nr1/campaigns/:campaignId/ai-suggest", async (req, res) => {
  const campaignId = parseInt(String(req.params.campaignId));
  const factors = await db.query.riskFactorsTable.findMany({
    where: and(eq(schema.riskFactorsTable.campaignId, campaignId), eq(schema.riskFactorsTable.tenantId, req.tenantId!)),
  });

  res.json({
    groups: [
      { label: "Carga Mental", factors: factors.filter(f => f.level === "high" || f.level === "critical").map(f => f.title) },
      { label: "Relacionamento Interpessoal", factors: factors.filter(f => f.level === "moderate").map(f => f.title) },
    ],
    actionDrafts: factors.slice(0, 3).map(f => ({
      title: `Mitigar: ${f.title}`,
      description: `Plano de ação para reduzir o fator de risco "${f.title}"`,
      priority: f.level === "critical" ? "critical" : f.level === "high" ? "high" : "medium",
    })),
    disclaimer: "Sugestões geradas por IA. Validação por profissional de saúde obrigatória.",
  });
});

// ── ACTIONS ───────────────────────────────────────────────────────────────
router.get("/nr1/campaigns/:campaignId/actions", async (req, res) => {
  const campaignId = parseInt(String(req.params.campaignId));
  const actions = await db.query.actionsTable.findMany({
    where: and(eq(schema.actionsTable.campaignId, campaignId), eq(schema.actionsTable.tenantId, req.tenantId!)),
    orderBy: (a, { desc }) => [desc(a.createdAt)],
  });
  res.json(actions.map(formatAction));
});

router.post("/nr1/campaigns/:campaignId/actions", requireRole("sst", "rh", "owner"), async (req, res) => {
  const campaignId = parseInt(String(req.params.campaignId));
  const { riskFactorId, title, description, priority, responsible, dueDate, controlHierarchy } = req.body;
  const [action] = await db
    .insert(schema.actionsTable)
    .values({
      tenantId: req.tenantId!,
      campaignId,
      riskFactorId,
      title,
      description,
      priority,
      responsible,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      controlHierarchy,
    })
    .returning();
  res.status(201).json(formatAction(action));
});

router.patch("/nr1/actions/:actionId", requireRole("sst", "rh", "owner"), async (req, res) => {
  const actionId = parseInt(String(req.params.actionId));
  const rawUpdates: Record<string, unknown> = { ...req.body };
  if (rawUpdates.dueDate) rawUpdates.dueDate = new Date(rawUpdates.dueDate as string);
  const [action] = await db
    .update(schema.actionsTable)
    .set(rawUpdates)
    .where(and(eq(schema.actionsTable.id, actionId), eq(schema.actionsTable.tenantId, req.tenantId!)))
    .returning();
  if (!action) { res.status(404).json({ error: "Action not found" }); return; }
  res.json(formatAction(action));
});

// ── DOCUMENTS ─────────────────────────────────────────────────────────────
router.get("/nr1/campaigns/:campaignId/documents", async (req, res) => {
  const campaignId = parseInt(String(req.params.campaignId));
  const docs = await db.query.documentsTable.findMany({
    where: and(eq(schema.documentsTable.campaignId, campaignId), eq(schema.documentsTable.tenantId, req.tenantId!)),
    orderBy: (d, { desc }) => [desc(d.createdAt)],
  });
  res.json(docs.map(formatDocument));
});

router.post("/nr1/campaigns/:campaignId/documents", requireRole("sst", "psicologo"), async (req, res) => {
  const campaignId = parseInt(String(req.params.campaignId));
  const { title, type, content } = req.body;
  const [doc] = await db
    .insert(schema.documentsTable)
    .values({ tenantId: req.tenantId!, campaignId, title, type, content })
    .returning();
  res.status(201).json(formatDocument(doc));
});

router.get("/nr1/documents/:documentId", async (req, res) => {
  const doc = await db.query.documentsTable.findFirst({
    where: and(eq(schema.documentsTable.id, parseInt(String(req.params.documentId))), eq(schema.documentsTable.tenantId, req.tenantId!)),
  });
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  res.json(formatDocument(doc));
});

router.patch("/nr1/documents/:documentId", requireRole("sst", "psicologo"), async (req, res) => {
  const { title, content, status } = req.body;
  const [doc] = await db
    .update(schema.documentsTable)
    .set({ title, content, status })
    .where(and(eq(schema.documentsTable.id, parseInt(String(req.params.documentId))), eq(schema.documentsTable.tenantId, req.tenantId!)))
    .returning();
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  res.json(formatDocument(doc));
});

router.post(
  "/nr1/documents/:documentId/publish",
  requireRole("psicologo", "sst"),
  async (req, res) => {
    const documentId = parseInt(String(req.params.documentId), 10);

    const doc = await db.query.documentsTable.findFirst({
      where: and(
        eq(schema.documentsTable.id, documentId),
        eq(schema.documentsTable.tenantId, req.tenantId!),
      ),
    });
    if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

    // RN-012: risk_inventory and assessment_report are GRO/PGR-equivalent and
    // require the Psicólogo role to sign (psychologist credential validation).
    const isGroPgr =
      doc.type === "risk_inventory" || doc.type === "assessment_report";
    if (isGroPgr && req.userRole !== "psicologo") {
      res.status(403).json({
        error:
          "Documentos de Inventário de Risco/Relatório de Avaliação exigem assinatura de Psicólogo (RN-012)",
      });
      return;
    }

    // RN-010: high/critical risks in the campaign must have at least one started action.
    if (doc.campaignId && isGroPgr) {
      const highRisks = await db.query.riskFactorsTable.findMany({
        where: and(
          eq(schema.riskFactorsTable.campaignId, doc.campaignId),
          eq(schema.riskFactorsTable.tenantId, req.tenantId!),
        ),
      });
      const blockers = await Promise.all(
        highRisks
          .filter((f) => f.level === "critical" || f.level === "high")
          .map(async (f) => {
            const count = await db.$count(schema.actionsTable, and(
              eq(schema.actionsTable.riskFactorId, f.id),
              eq(schema.actionsTable.tenantId, req.tenantId!),
              ne(schema.actionsTable.status, "pending"),
            ));
            return count === 0 ? f.title : null;
          }),
      );
      const missing = blockers.filter(Boolean);
      if (missing.length > 0) {
        res.status(422).json({
          error: "Fatores de risco alto/crítico sem plano de ação iniciado (RN-010)",
          blockers: missing,
        });
        return;
      }
    }

    const [published] = await db
      .update(schema.documentsTable)
      .set({ status: "published", signedBy: req.userId, signedAt: new Date() })
      .where(and(
        eq(schema.documentsTable.id, documentId),
        eq(schema.documentsTable.tenantId, req.tenantId!),
      ))
      .returning();
    if (!published) { res.status(404).json({ error: "Document not found" }); return; }
    res.json(formatDocument(published));
  },
);

// ── HELPERS ────────────────────────────────────────────────────────────────
async function findCampaign(tenantId: number, campaignId: number) {
  return db.query.campaignsTable.findFirst({
    where: and(eq(schema.campaignsTable.id, campaignId), eq(schema.campaignsTable.tenantId, tenantId)),
  });
}

function formatCampaign(c: typeof schema.campaignsTable.$inferSelect) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    status: c.status,
    tenantId: c.tenantId,
    targetUnitIds: c.targetUnitIds,
    instrumentType: c.instrumentType,
    privacyThreshold: c.privacyThreshold,
    startDate: c.startDate?.toISOString() ?? null,
    endDate: c.endDate?.toISOString() ?? null,
    totalInvited: c.totalInvited,
    totalResponded: c.totalResponded,
    participationRate: c.totalInvited > 0 ? Math.round((c.totalResponded / c.totalInvited) * 100) : null,
    createdAt: c.createdAt.toISOString(),
  };
}

function formatRiskFactor(f: typeof schema.riskFactorsTable.$inferSelect) {
  return {
    id: f.id,
    campaignId: f.campaignId,
    title: f.title,
    description: f.description,
    probability: f.probability,
    severity: f.severity,
    level: f.level,
    exposedGroups: f.exposedGroups,
    existingControls: f.existingControls,
    createdAt: f.createdAt.toISOString(),
  };
}

function formatAction(a: typeof schema.actionsTable.$inferSelect) {
  return {
    id: a.id,
    campaignId: a.campaignId,
    riskFactorId: a.riskFactorId,
    title: a.title,
    description: a.description,
    status: a.status,
    priority: a.priority,
    responsible: a.responsible,
    dueDate: a.dueDate?.toISOString() ?? null,
    controlHierarchy: a.controlHierarchy,
    evidence: a.evidence,
    createdAt: a.createdAt.toISOString(),
  };
}

function formatDocument(d: typeof schema.documentsTable.$inferSelect) {
  return {
    id: d.id,
    campaignId: d.campaignId,
    title: d.title,
    type: d.type,
    status: d.status,
    version: d.version,
    content: d.content,
    hash: d.hash,
    signedBy: d.signedBy,
    signedAt: d.signedAt?.toISOString() ?? null,
    createdAt: d.createdAt.toISOString(),
  };
}

export default router;
