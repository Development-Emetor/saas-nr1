import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { db, usersTable, tenantsTable } from "@workspace/db";
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
    secure: true,
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

router.get("/login", async (req: Request, res: Response) => {
  const returnTo = getSafeReturnTo(req.query.returnTo);

  const mockClaims = {
    sub: "mock-user-123",
    email: "johnson@emetor.com",
    firstName: "Johnson",
    lastName: "Developer",
    profileImageUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150",
  };

  const dbUser = await upsertUser(mockClaims);

  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: "mock-access-token",
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const origin = getOrigin(req);
  const sid = getSessionId(req);
  await clearSession(res, sid);
  res.redirect(origin);
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
