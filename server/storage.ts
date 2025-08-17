import {
  users,
  condominiums,
  audits,
  auditReports,
  userCondominiums,
  type User,
  type UpsertUser,
  type Condominium,
  type InsertCondominium,
  type Audit,
  type InsertAudit,
  type AuditReport,
  type InsertAuditReport,
  type UserCondominium,
  type InsertUserCondominium,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  createUser(user: any): Promise<User>;
  updateUser(id: string, user: any): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Condominium operations
  getCondominiumsByOwnerId(ownerId: string): Promise<Condominium[]>;
  getCondominiumById(id: string): Promise<Condominium | undefined>;
  createCondominium(condominium: InsertCondominium): Promise<Condominium>;
  
  // Audit operations
  getAuditsByCondominiumId(condominiumId: string): Promise<Audit[]>;
  getAuditById(id: string): Promise<Audit | undefined>;
  createAudit(audit: InsertAudit): Promise<Audit>;
  updateAuditStatus(id: string, status: string, documentPath?: string): Promise<void>;
  
  // Audit report operations
  getAuditReportByAuditId(auditId: string): Promise<AuditReport | undefined>;
  createAuditReport(report: InsertAuditReport): Promise<AuditReport>;
  getAllAuditReports(): Promise<AuditReport[]>;
  deleteAuditReport(id: string): Promise<void>;
  
  // User-Condominium associations
  createUserCondominium(association: InsertUserCondominium): Promise<UserCondominium>;
  
  // Dashboard stats
  getDashboardStats(userId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getCondominiumsByOwnerId(ownerId: string): Promise<Condominium[]> {
    return await db
      .select()
      .from(condominiums)
      .where(eq(condominiums.ownerId, ownerId))
      .orderBy(desc(condominiums.createdAt));
  }

  async getCondominiumById(id: string): Promise<Condominium | undefined> {
    const [condominium] = await db
      .select()
      .from(condominiums)
      .where(eq(condominiums.id, id));
    return condominium;
  }

  async createCondominium(condominium: InsertCondominium): Promise<Condominium> {
    const [newCondominium] = await db
      .insert(condominiums)
      .values(condominium)
      .returning();
    return newCondominium;
  }

  async getAuditsByCondominiumId(condominiumId: string): Promise<Audit[]> {
    return await db
      .select()
      .from(audits)
      .where(eq(audits.condominiumId, condominiumId))
      .orderBy(desc(audits.year), desc(audits.month));
  }

  async getAuditById(id: string): Promise<Audit | undefined> {
    const [audit] = await db
      .select()
      .from(audits)
      .where(eq(audits.id, id));
    return audit;
  }

  async createAudit(audit: InsertAudit): Promise<Audit> {
    const [newAudit] = await db
      .insert(audits)
      .values(audit)
      .returning();
    return newAudit;
  }

  async updateAuditStatus(id: string, status: string, documentPath?: string): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };
    if (documentPath) {
      updateData.documentPath = documentPath;
    }
    
    await db
      .update(audits)
      .set(updateData)
      .where(eq(audits.id, id));
  }

  async getAuditReportByAuditId(auditId: string): Promise<AuditReport | undefined> {
    const [report] = await db
      .select()
      .from(auditReports)
      .where(eq(auditReports.auditId, auditId));
    return report;
  }

  async createAuditReport(report: InsertAuditReport): Promise<AuditReport> {
    const [newReport] = await db
      .insert(auditReports)
      .values(report)
      .returning();
    return newReport;
  }

  // Admin methods
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(userData: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, userData: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllAuditReports(): Promise<AuditReport[]> {
    return await db.select().from(auditReports).orderBy(desc(auditReports.createdAt));
  }

  async deleteAuditReport(id: string): Promise<void> {
    await db.delete(auditReports).where(eq(auditReports.id, id));
  }

  async createUserCondominium(associationData: InsertUserCondominium): Promise<UserCondominium> {
    const [association] = await db
      .insert(userCondominiums)
      .values(associationData)
      .returning();
    return association;
  }

  async getDashboardStats(userId: string): Promise<any> {
    const condominiums = await this.getCondominiumsByOwnerId(userId);
    
    let totalAudits = 0;
    let completedAudits = 0;
    let pendingAudits = 0;
    let totalInconsistencies = 0;
    
    for (const condo of condominiums) {
      const audits = await this.getAuditsByCondominiumId(condo.id);
      totalAudits += audits.length;
      
      for (const audit of audits) {
        if (audit.status === "completed") {
          completedAudits++;
          const report = await this.getAuditReportByAuditId(audit.id);
          if (report && report.inconsistencies) {
            totalInconsistencies += (report.inconsistencies as any[]).length;
          }
        } else if (audit.status === "pending" || audit.status === "processing") {
          pendingAudits++;
        }
      }
    }
    
    return {
      completed: completedAudits,
      pending: pendingAudits,
      condominiums: condominiums.length,
      issues: totalInconsistencies,
    };
  }
}

export const storage = new DatabaseStorage();
