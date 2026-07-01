import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, schema } from "../lib/db";
const { usersTable, tenantsTable } = schema;
import { eq } from "drizzle-orm";
import {
  clearSession,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function upsertUser(claims: {
  sub: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}) {
  const profileData = {
    id: claims.sub,
    email: claims.email,
    firstName: claims.firstName,
    lastName: claims.lastName,
    profileImageUrl: claims.profileImageUrl,
  };

  const existingUser = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, profileData.id),
  });

  if (existingUser) {
    const [updated] = await db
      .update(usersTable)
      .set({
        email: profileData.email,
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        profileImageUrl: profileData.profileImageUrl,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, profileData.id))
      .returning();
    return updated ?? existingUser;
  }

  const displayName = [profileData.firstName, profileData.lastName].filter(Boolean).join(" ") || "Empresa";
  const [newTenant] = await db
    .insert(tenantsTable)
    .values({
      name: `${displayName} — Empresa`,
      plan: "essencial",
      activeModules: ["nr1", "recruitment"],
    })
    .returning();

  const [user] = await db
    .insert(usersTable)
    .values({ ...profileData, tenantId: newTenant.id, role: "owner" })
    .returning();

  return user;
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const checkHash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(checkHash, "hex"));
}

router.post("/login", async (req: Request, res: Response) => {
  const { email: rawEmail, password } = req.body || {};
  
  if (!rawEmail) {
    res.status(400).json({ error: "E-mail é obrigatório" });
    return;
  }
  if (!password) {
    res.status(400).json({ error: "Senha é obrigatória" });
    return;
  }

  const email = String(rawEmail).trim().toLowerCase();

  let dbUser = await db.query.usersTable.findFirst({
    where: eq(schema.usersTable.email, email),
  });

  if (!dbUser) {
    // If logging in with the default admin email, seed it automatically
    if (email === "johnson@emetor.com") {
      const mockClaims = {
        sub: "mock-user-johnson",
        email: "johnson@emetor.com",
        firstName: "Johnson",
        lastName: "Developer",
        profileImageUrl: "https://avatar.iran.liara.run/public/1",
      };
      dbUser = await upsertUser(mockClaims);
      // Ensure default user has owner role
      await db
        .update(schema.usersTable)
        .set({ role: "owner" })
        .where(eq(schema.usersTable.id, dbUser.id));
      dbUser.role = "owner";
    } else {
      res.status(401).json({ error: "Usuário não cadastrado nesta plataforma. Use johnson@emetor.com para o primeiro acesso." });
      return;
    }
  }

  // Password activation or verification
  if (!dbUser.passwordHash) {
    const hashed = hashPassword(password);
    await db
      .update(schema.usersTable)
      .set({ passwordHash: hashed })
      .where(eq(schema.usersTable.id, dbUser.id));
    dbUser.passwordHash = hashed;
  } else {
    if (!verifyPassword(password, dbUser.passwordHash)) {
      res.status(401).json({ error: "Senha incorreta" });
      return;
    }
  }

  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      role: dbUser.role,
    },
    access_token: "mock-access-token",
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.json({ user: sessionData.user });
});

router.post("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.json({ success: true });
});

router.post(
  "/mobile-auth/token-exchange",
  async (req: Request, res: Response) => {
    const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required parameters" });
      return;
    }

    try {
      const mockClaims = {
        sub: "mock-user-123",
        email: "johnson@emetor.com",
        firstName: "Johnson",
        lastName: "Developer",
        profileImageUrl: null,
      };
      const dbUser = await upsertUser(mockClaims);
      const sessionData: SessionData = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
          role: dbUser.role,
        },
        access_token: "mock-access-token",
      };
      const sid = await createSession(sessionData);
      res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
    } catch (err) {
      req.log.error({ err }, "Mobile token exchange error");
      res.status(500).json({ error: "Token exchange failed" });
    }
  },
);

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
