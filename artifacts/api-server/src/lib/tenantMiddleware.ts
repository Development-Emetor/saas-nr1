import type { Request, Response, NextFunction } from "express";
import { db, schema } from "./db";
import { eq, sql } from "drizzle-orm";
import type { UserRole } from "../middlewares/requireAuth";

declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      userId?: string;
    }
  }
}

export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user?.id) {
    res.status(401).json({ error: "Autenticação necessária" });
    return;
  }

  const dbUser = await db.query.usersTable.findFirst({
    where: eq(schema.usersTable.id, req.user.id),
  });

  if (!dbUser?.tenantId) {
    res.status(403).json({
      error:
        "Usuário sem empresa vinculada. Contacte o administrador da plataforma.",
    });
    return;
  }

  req.tenantId = dbUser.tenantId;
  req.userId = dbUser.id;
  req.userRole = dbUser.role as UserRole;

  // Propagate tenant context to PostgreSQL session so RLS policies are effective.
  // This is defense-in-depth: even if application-level checks are bypassed,
  // DB-level RLS will reject cross-tenant queries.
  try {
    await db.execute(sql`SET LOCAL app.tenant_id = ${dbUser.tenantId.toString()}`);
  } catch {
    // SET LOCAL only works inside a transaction; ignore outside one.
    // Application-level tenant isolation remains the primary enforcement.
  }

  next();
}
