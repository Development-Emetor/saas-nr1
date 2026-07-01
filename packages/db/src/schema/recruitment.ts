import { pgTable, serial, text, integer, timestamp, pgEnum, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const jobStatusEnum = pgEnum("job_status", ["draft", "open", "paused", "closed"]);
export const candidateStageEnum = pgEnum("candidate_stage", ["screening", "interview", "offer", "hired", "rejected"]);

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  department: text("department"),
  description: text("description"),
  requirements: text("requirements"),
  status: jobStatusEnum("status").notNull().default("draft"),
  companyValues: text("company_values").array().notNull().default([]),
  requiredCompetencies: text("required_competencies").array().notNull().default([]),
  idealPersonaDescription: text("ideal_persona_description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const foldersTable = pgTable("folders", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  department: text("department"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const candidatesTable = pgTable("candidates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  jobId: integer("job_id").references(() => jobsTable.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  stage: candidateStageEnum("stage").notNull().default("screening"),
  cvText: text("cv_text"),
  linkedinUrl: text("linkedin_url"),
  githubUrl: text("github_url"),
  portfolioUrl: text("portfolio_url"),
  skills: text("skills").array().notNull().default([]),
  experience: text("experience"),
  education: text("education"),
  fitScore: real("fit_score"),
  fitJustification: text("fit_justification"),
  fitDimensions: jsonb("fit_dimensions"),
  notes: text("notes"),
  stageHistory: jsonb("stage_history").notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const folderCandidatesTable = pgTable("folder_candidates", {
  id: serial("id").primaryKey(),
  folderId: integer("folder_id").notNull().references(() => foldersTable.id, { onDelete: "cascade" }),
  candidateId: integer("candidate_id").notNull().references(() => candidatesTable.id, { onDelete: "cascade" }),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;

export const insertFolderSchema = createInsertSchema(foldersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof foldersTable.$inferSelect;

export const insertCandidateSchema = createInsertSchema(candidatesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Candidate = typeof candidatesTable.$inferSelect;
