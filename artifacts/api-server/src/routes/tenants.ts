import { Router } from "express";
import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/requireAuth";

const router = Router();

router.get("/tenants/me", async (req, res) => {
  const tenant = await db.query.tenantsTable.findFirst({
    where: eq(schema.tenantsTable.id, req.tenantId!),
  });
  if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }
  res.json({
    id: tenant.id,
    name: tenant.name,
    cnpj: tenant.cnpj,
    plan: tenant.plan,
    activeModules: tenant.activeModules,
    privacyThreshold: tenant.privacyThreshold,
    createdAt: tenant.createdAt.toISOString(),
  });
});

router.patch("/tenants/me", requireRole("owner"), async (req, res) => {
  const { name, cnpj, privacyThreshold } = req.body as { name?: string; cnpj?: string; privacyThreshold?: number };
  const updates: Partial<typeof schema.tenantsTable.$inferInsert> = {};
  if (name) updates.name = name;
  if (cnpj !== undefined) updates.cnpj = cnpj;
  if (privacyThreshold !== undefined) updates.privacyThreshold = privacyThreshold;

  const [tenant] = await db
    .update(schema.tenantsTable)
    .set(updates)
    .where(eq(schema.tenantsTable.id, req.tenantId!))
    .returning();

  if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

  res.json({
    id: tenant.id,
    name: tenant.name,
    cnpj: tenant.cnpj,
    plan: tenant.plan,
    activeModules: tenant.activeModules,
    privacyThreshold: tenant.privacyThreshold,
    createdAt: tenant.createdAt.toISOString(),
  });
});

router.get("/tenants/subscription", async (req, res) => {
  const tenant = await db.query.tenantsTable.findFirst({
    where: eq(schema.tenantsTable.id, req.tenantId!),
  });
  if (!tenant) { res.status(404).json({ error: "Tenant not found" }); return; }

  const workerCount = await db.$count(
    schema.workersTable,
    eq(schema.workersTable.tenantId, req.tenantId!)
  );

  res.json({
    plan: tenant.plan,
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    activeWorkers: workerCount,
    modules: tenant.activeModules,
  });
});

router.get("/tenants/modules", async (req, res) => {
  const tenant = await db.query.tenantsTable.findFirst({
    where: eq(schema.tenantsTable.id, req.tenantId!),
  });
  res.json({ modules: tenant?.activeModules ?? [] });
});

export default router;
