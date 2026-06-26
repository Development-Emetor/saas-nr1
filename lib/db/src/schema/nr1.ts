import { pgTable, serial, text, integer, timestamp, pgEnum, boolean, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { unitsTable } from "./organizations";

export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "published", "closed", "analyzing"]);
export const instrumentTypeEnum = pgEnum("instrument_type", ["demand_control", "effort_reward", "custom"]);
export const riskLevelEnum = pgEnum("risk_level", ["low", "moderate", "high", "critical"]);
export const riskProbabilityEnum = pgEnum("risk_probability", ["very_low", "low", "medium", "high", "very_high"]);
export const actionStatusEnum = pgEnum("action_status", ["pending", "in_progress", "done", "cancelled"]);
export const actionPriorityEnum = pgEnum("action_priority", ["low", "medium", "high", "critical"]);
export const documentTypeEnum = pgEnum("document_type", ["risk_inventory", "assessment_report", "action_plan", "devolutiva"]);
export const documentStatusEnum = pgEnum("document_status_nr1", ["draft", "review", "published"]);

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  instrumentType: instrumentTypeEnum("instrument_type").notNull().default("demand_control"),
  privacyThreshold: integer("privacy_threshold").notNull().default(7),
  targetUnitIds: integer("target_unit_ids").array().notNull().default([]),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  totalInvited: integer("total_invited").notNull().default(0),
  totalResponded: integer("total_responded").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const participationTokensTable = pgTable("participation_tokens", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  hasResponded: boolean("has_responded").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const responsesTable = pgTable("responses", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  pseudoRespondentId: text("pseudo_respondent_id").notNull(),
  answers: jsonb("answers").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
});

export const riskFactorsTable = pgTable("risk_factors", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  probability: riskProbabilityEnum("probability").notNull(),
  severity: riskProbabilityEnum("severity").notNull(),
  level: riskLevelEnum("level").notNull(),
  exposedGroups: text("exposed_groups"),
  existingControls: text("existing_controls"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const actionsTable = pgTable("actions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  riskFactorId: integer("risk_factor_id").references(() => riskFactorsTable.id),
  title: text("title").notNull(),
  description: text("description"),
  status: actionStatusEnum("status").notNull().default("pending"),
  priority: actionPriorityEnum("priority").notNull().default("medium"),
  responsible: text("responsible"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  controlHierarchy: text("control_hierarchy"),
  evidence: text("evidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  campaignId: integer("campaign_id").notNull().references(() => campaignsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: documentTypeEnum("type").notNull(),
  status: documentStatusEnum("status").notNull().default("draft"),
  version: integer("version").notNull().default(1),
  content: text("content"),
  hash: text("hash"),
  signedBy: text("signed_by"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const auditLogsTable = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;

export const insertRiskFactorSchema = createInsertSchema(riskFactorsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRiskFactor = z.infer<typeof insertRiskFactorSchema>;
export type RiskFactor = typeof riskFactorsTable.$inferSelect;

export const insertActionSchema = createInsertSchema(actionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAction = z.infer<typeof insertActionSchema>;
export type Action = typeof actionsTable.$inferSelect;

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
