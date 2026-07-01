import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAuth";

type Plan = "essencial" | "gestao" | "enterprise" | "profissional";
const VALID_PLANS: Plan[] = ["essencial", "gestao", "enterprise", "profissional"];

function parsePlan(value: unknown): Plan | undefined {
  return VALID_PLANS.includes(value as Plan) ? (value as Plan) : undefined;
}

const router = Router();

router.get("/clients", requireAdmin, async (_req, res) => {
  try {
    const allTenants = await db
      .select()
      .from(tenantsTable)
      .orderBy(tenantsTable.createdAt);
    res.json(allTenants);
    return;
  } catch {
    res.status(500).json({ error: "Erro ao buscar clientes" });
    return;
  }
});

router.post("/clients", requireAdmin, async (req, res) => {
  try {
    const body = req.body as { name?: unknown; slug?: unknown; plan?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!name || !slug) {
      res.status(400).json({ error: "name e slug são obrigatórios" });
      return;
    }
    const plan: Plan = parsePlan(body.plan) ?? "essencial";
    const [tenant] = await db
      .insert(tenantsTable)
      .values({ name, slug, plan, activeModules: ["nr1", "recruitment"] })
      .returning();
    res.status(201).json(tenant);
    return;
  } catch {
    res.status(500).json({ error: "Erro ao criar cliente" });
    return;
  }
});

router.patch("/clients/:id", requireAdmin, async (req, res) => {
  try {
    const rawId = Array.isArray(req.params["id"])
      ? req.params["id"][0]
      : req.params["id"];
    const id = parseInt(String(rawId), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "ID inválido" });
      return;
    }
    const body = req.body as { name?: unknown; plan?: unknown; active?: unknown };
    const patch: { name?: string; plan?: Plan; active?: boolean } = {};
    if (typeof body.name === "string" && body.name.trim()) {
      patch.name = body.name.trim();
    }
    const newPlan = parsePlan(body.plan);
    if (newPlan) patch.plan = newPlan;
    if (typeof body.active === "boolean") patch.active = body.active;

    const [updated] = await db
      .update(tenantsTable)
      .set(patch)
      .where(eq(tenantsTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Cliente não encontrado" });
      return;
    }
    res.json(updated);
    return;
  } catch {
    res.status(500).json({ error: "Erro ao atualizar cliente" });
    return;
  }
});

export default router;
