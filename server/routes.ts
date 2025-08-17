import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertCondominiumSchema, insertAuditSchema } from "@shared/schema";
import { analyzeCondominiumAccounts, extractTextFromPDF } from "./openai";
import multer from "multer";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Object storage routes for document serving
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Get upload URL for documents
  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Condominiums routes
  app.get("/api/condominiums", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const condominiums = await storage.getCondominiumsByOwnerId(userId);
      res.json(condominiums);
    } catch (error) {
      console.error("Error fetching condominiums:", error);
      res.status(500).json({ message: "Failed to fetch condominiums" });
    }
  });

  app.post("/api/condominiums", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const condominiumData = {
        ...req.body,
        ownerId: userId,
      };
      
      const condominium = await storage.createCondominium(condominiumData);
      res.status(201).json(condominium);
    } catch (error: any) {
      console.error("Error creating condominium:", error);
      res.status(400).json({ message: "Invalid condominium data", error: error.message });
    }
  });

  app.get("/api/condominiums/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const condominium = await storage.getCondominiumById(req.params.id);
      
      if (!condominium) {
        return res.status(404).json({ message: "Condominium not found" });
      }
      
      if (condominium.ownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(condominium);
    } catch (error) {
      console.error("Error fetching condominium:", error);
      res.status(500).json({ message: "Failed to fetch condominium" });
    }
  });

  // Audits routes
  app.get("/api/condominiums/:id/audits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const condominium = await storage.getCondominiumById(req.params.id);
      
      if (!condominium || condominium.ownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const audits = await storage.getAuditsByCondominiumId(req.params.id);
      res.json(audits);
    } catch (error) {
      console.error("Error fetching audits:", error);
      res.status(500).json({ message: "Failed to fetch audits" });
    }
  });

  app.post("/api/audits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const auditData = insertAuditSchema.parse(req.body);
      
      // Verify user owns the condominium
      const condominium = await storage.getCondominiumById(auditData.condominiumId);
      if (!condominium || condominium.ownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const audit = await storage.createAudit(auditData);
      res.status(201).json(audit);
    } catch (error) {
      console.error("Error creating audit:", error);
      res.status(400).json({ message: "Invalid audit data" });
    }
  });

  // Process uploaded document
  app.post("/api/audits/:id/process", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const auditId = req.params.id;
      const { documentUrl } = req.body;
      
      if (!documentUrl) {
        return res.status(400).json({ error: "documentUrl is required" });
      }
      
      // Get audit and verify ownership
      const audit = await storage.getAuditById(auditId);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      const condominium = await storage.getCondominiumById(audit.condominiumId);
      if (!condominium || condominium.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Set ACL for uploaded document
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        documentUrl,
        {
          owner: userId,
          visibility: "private",
        }
      );
      
      // Update audit with document path and processing status
      await storage.updateAuditStatus(auditId, "processing", objectPath);
      
      // Start async processing
      processAuditDocument(auditId, documentUrl).catch(error => {
        console.error("Error processing audit document:", error);
        storage.updateAuditStatus(auditId, "error");
      });
      
      res.json({ 
        message: "Document processing started",
        objectPath 
      });
    } catch (error) {
      console.error("Error processing audit:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get audit report
  app.get("/api/audits/:id/report", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const auditId = req.params.id;
      
      // Verify audit ownership
      const audit = await storage.getAuditById(auditId);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      const condominium = await storage.getCondominiumById(audit.condominiumId);
      if (!condominium || condominium.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const report = await storage.getAuditReportByAuditId(auditId);
      if (!report) {
        return res.status(404).json({ error: "Report not found" });
      }
      
      res.json({ audit, report, condominium });
    } catch (error) {
      console.error("Error fetching audit report:", error);
      res.status(500).json({ error: "Failed to fetch audit report" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const condominiums = await storage.getCondominiumsByOwnerId(userId);
      
      let totalAudits = 0;
      let completedAudits = 0;
      let pendingAudits = 0;
      let totalInconsistencies = 0;
      
      for (const condo of condominiums) {
        const audits = await storage.getAuditsByCondominiumId(condo.id);
        totalAudits += audits.length;
        
        for (const audit of audits) {
          if (audit.status === "completed") {
            completedAudits++;
            const report = await storage.getAuditReportByAuditId(audit.id);
            if (report && report.inconsistencies) {
              totalInconsistencies += (report.inconsistencies as any[]).length;
            }
          } else if (audit.status === "pending" || audit.status === "processing") {
            pendingAudits++;
          }
        }
      }
      
      res.json({
        completed: completedAudits,
        pending: pendingAudits,
        condominiums: condominiums.length,
        issues: totalInconsistencies,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function processAuditDocument(auditId: string, documentUrl: string) {
  try {
    // Download document from storage
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error("Failed to download document");
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Extract text from PDF
    const pdfText = await extractTextFromPDF(buffer);
    
    // Analyze with OpenAI
    const analysis = await analyzeCondominiumAccounts(pdfText);
    
    // Save report
    await storage.createAuditReport({
      auditId,
      totalBalance: analysis.totalBalance.toString(),
      totalExpenses: analysis.totalExpenses.toString(),
      biggestExpense: analysis.biggestExpense.toString(),
      biggestExpenseDescription: analysis.biggestExpenseDescription,
      expenseCategories: analysis.expenseCategories,
      inconsistencies: analysis.inconsistencies,
      aiAnalysis: analysis.summary,
    });
    
    // Update audit status
    await storage.updateAuditStatus(auditId, "completed");
    
    console.log(`Audit ${auditId} processed successfully`);
  } catch (error) {
    console.error(`Error processing audit ${auditId}:`, error);
    await storage.updateAuditStatus(auditId, "error");
  }
}
