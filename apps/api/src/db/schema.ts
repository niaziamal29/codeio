import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  real,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// === Enums ===

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "archived",
  "deleted",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "idle",
  "running",
  "paused",
  "complete",
  "error",
]);

export const qaStatusEnum = pgEnum("qa_status", [
  "pending",
  "passed",
  "failed",
  "skipped",
]);

export const messageRoleEnum = pgEnum("message_role", [
  "user",
  "assistant",
  "system",
  "tool",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "project.create",
  "project.delete",
  "session.start",
  "session.end",
  "checkpoint.create",
  "checkpoint.accept",
  "checkpoint.revise",
  "checkpoint.undo",
  "export.zip",
  "preview.deploy",
]);

// === Tables ===

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  plan: varchar("plan", { length: 50 }).notNull().default("free"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  framework: varchar("framework", { length: 50 }),
  status: projectStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  status: sessionStatusEnum("status").notNull().default("idle"),
  agentModel: varchar("agent_model", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const checkpoints = pgTable("checkpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .references(() => sessions.id, { onDelete: "cascade" })
    .notNull(),
  summary: text("summary").notNull(),
  gitSha: varchar("git_sha", { length: 40 }),
  qaStatus: qaStatusEnum("qa_status").notNull().default("pending"),
  screenshotUrl: text("screenshot_url"),
  filesChanged: jsonb("files_changed").$type<string[]>().default([]),
  confidence: real("confidence"),
  suggestedNextSteps: jsonb("suggested_next_steps").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .references(() => sessions.id, { onDelete: "cascade" })
    .notNull(),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: auditActionEnum("action").notNull(),
  resourceType: varchar("resource_type", { length: 50 }).notNull(),
  resourceId: varchar("resource_id", { length: 255 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
