import { pgTable, serial, text, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planEnum = pgEnum("plan_type", ["essencial", "gestao", "enterprise", "profissional"]);

export const tenantsTable = pgTable("tenants", {
  id: serial("id").primaryKey(),
  clerkOrgId: text("clerk_org_id").unique(),
  name: text("name").notNull(),
  cnpj: text("cnpj"),
  plan: planEnum("plan").notNull().default("essencial"),
  activeModules: text("active_modules").array().notNull().default(["nr1"]),
  privacyThreshold: integer("privacy_threshold").notNull().default(7),
  slug: text("slug").unique(),
  active: boolean("active").notNull().default(true),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
