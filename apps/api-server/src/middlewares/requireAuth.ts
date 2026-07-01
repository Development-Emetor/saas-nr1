import type { Request, Response, NextFunction } from "express";

export type UserRole =
  | "platform_admin"
  | "owner"
  | "rh"
  | "sst"
  | "psicologo";

declare global {
  namespace Express {
    interface Request {
      userRole?: UserRole;
    }
  }
}

const PLATFORM_ADMIN_IDS = (process.env.PLATFORM_ADMIN_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.id) {
    res.status(401).json({ error: "Autenticação necessária" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.id) {
    res.status(401).json({ error: "Autenticação necessária" });
    return;
  }
  const isPlatformAdmin =
    PLATFORM_ADMIN_IDS.includes(req.user.id) ||
    req.userRole === "platform_admin";
  if (!isPlatformAdmin) {
    res.status(403).json({
      error: "Acesso restrito a administradores da plataforma",
    });
    return;
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      res.status(401).json({ error: "Autenticação necessária" });
      return;
    }
    const role = req.userRole;
    if (!role) {
      res.status(403).json({ error: "Perfil de acesso não configurado" });
      return;
    }
    if (role === "platform_admin") {
      next();
      return;
    }
    if (!roles.includes(role)) {
      res.status(403).json({
        error: `Acesso restrito. Perfis permitidos: ${roles.join(", ")}`,
      });
      return;
    }
    next();
  };
}
