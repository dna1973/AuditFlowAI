import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  decimal,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("user"), // admin, manager, user
  quadra: varchar("quadra"), // Quadra identification
  lote: varchar("lote"), // Lote identification  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Condominiums table
export const condominiums = pgTable("condominiums", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  address: text("address").notNull(),
  units: integer("units").notNull().default(1),
  administrator: varchar("administrator").notNull(),
  cnpj: varchar("cnpj"),
  ownerId: varchar("owner_id").notNull(),
  isActive: boolean("is_active").default(true),
  status: varchar("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audits table
export const audits = pgTable("audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  condominiumId: varchar("condominium_id").notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  documentPath: varchar("document_path"), // Object storage path
  status: varchar("status").notNull().default("pending"), // pending, processing, completed, error
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit reports table
export const auditReports = pgTable("audit_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  auditId: varchar("audit_id").notNull().unique(),
  totalBalance: decimal("total_balance", { precision: 12, scale: 2 }),
  totalExpenses: decimal("total_expenses", { precision: 12, scale: 2 }),
  biggestExpense: decimal("biggest_expense", { precision: 12, scale: 2 }),
  biggestExpenseDescription: text("biggest_expense_description"),
  expenseCategories: jsonb("expense_categories"), // Array of {name, amount, percentage}
  inconsistencies: jsonb("inconsistencies"), // Array of inconsistency objects
  findings: jsonb("findings"), // Array of findings with severity
  aiAnalysis: text("ai_analysis"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Type exports
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertCondominium = typeof condominiums.$inferInsert;
export type Condominium = typeof condominiums.$inferSelect;

export type InsertAudit = typeof audits.$inferInsert;
export type Audit = typeof audits.$inferSelect;

export type InsertAuditReport = typeof auditReports.$inferInsert;
export type AuditReport = typeof auditReports.$inferSelect;

// Form schemas
export const insertCondominiumSchema = createInsertSchema(condominiums).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  ownerId: true,
  cnpj: true,
  status: true,
  isActive: true,
});

export const insertAuditSchema = createInsertSchema(audits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  uploadedAt: true,
});

// User-Condominium association table
export const userCondominiums = pgTable("user_condominiums", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  condominiumId: varchar("condominium_id").notNull(),
  quadra: varchar("quadra"), // Quadra for this specific condominium
  lote: varchar("lote"), // Lote for this specific condominium
  role: varchar("role").notNull().default("inquilino"), // inquilino, proprietario
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAuditReportSchema = createInsertSchema(auditReports).omit({
  id: true,
  createdAt: true,
});

// New type exports
export type UserCondominium = typeof userCondominiums.$inferSelect;
export type InsertUserCondominium = typeof userCondominiums.$inferInsert;
