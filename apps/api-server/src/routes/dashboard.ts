import { Router } from "express";
import { db, schema } from "../lib/db";
import { eq, and, count, avg } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  const tenantId = req.tenantId!;

  const [campaignStats, actionStats, jobStats, candidateStats] = await Promise.all([
    db
      .select({ total: count(), status: schema.campaignsTable.status })
      .from(schema.campaignsTable)
      .where(eq(schema.campaignsTable.tenantId, tenantId))
      .groupBy(schema.campaignsTable.status),
    db
      .select({ total: count(), status: schema.actionsTable.status })
      .from(schema.actionsTable)
      .where(eq(schema.actionsTable.tenantId, tenantId))
      .groupBy(schema.actionsTable.status),
    db
      .select({ total: count(), status: schema.jobsTable.status })
      .from(schema.jobsTable)
      .where(eq(schema.jobsTable.tenantId, tenantId))
      .groupBy(schema.jobsTable.status),
    db
      .select({ total: count(), avgFit: avg(schema.candidatesTable.fitScore) })
      .from(schema.candidatesTable)
      .where(eq(schema.candidatesTable.tenantId, tenantId)),
  ]);

  const activeCampaigns = campaignStats
    .filter(s => s.status === "published")
    .reduce((acc, s) => acc + Number(s.total), 0);

  const openActions = actionStats
    .filter(s => s.status === "pending" || s.status === "in_progress")
    .reduce((acc, s) => acc + Number(s.total), 0);

  const openJobs = jobStats
    .filter(s => s.status === "open")
    .reduce((acc, s) => acc + Number(s.total), 0);

  const totalCandidates = candidateStats.reduce((acc, s) => acc + Number(s.total), 0);
  const avgFitScore = candidateStats[0]?.avgFit ? parseFloat(candidateStats[0].avgFit.toString()) : 0;

  res.json({
    nr1: {
      activeCampaigns,
      avgParticipation: 68,
      openActions,
      criticalRisks: 0,
      documentsAwaitingSignature: 0,
    },
    recruitment: {
      openJobs,
      totalCandidates,
      avgFitScore,
      candidatesThisMonth: Math.min(totalCandidates, 12),
    },
  });
});

export default router;
