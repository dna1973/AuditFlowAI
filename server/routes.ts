import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { insertCondominiumSchema, insertAuditSchema } from "@shared/schema";
import { analyzeCondominiumAccounts, extractTextFromPDF } from "./openai";

// Process audit document function
async function processAuditDocument(auditId: string, documentPath: string) {
  try {
    console.log(`Processing audit document for audit ${auditId} at path ${documentPath}`);
    const objectStorageService = new ObjectStorageService();
    
    // Get audit and condominium info for unit count
    const audit = await storage.getAuditById(auditId);
    if (!audit) {
      throw new Error("Audit not found");
    }
    
    const condominium = await storage.getCondominiumById(audit.condominiumId);
    if (!condominium) {
      throw new Error("Condominium not found");
    }
    
    console.log(`Condominium ${condominium.name} has ${condominium.units} total units`);
    
    // Download document from storage
    const objectFile = await objectStorageService.getObjectEntityFile(documentPath);
    const fileBuffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = objectFile.createReadStream();
      
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
    
    // Extract text from PDF
    console.log("Extracting text from PDF...");
    const extractedText = await extractTextFromPDF(fileBuffer);
    console.log(`Text extraction completed. Text length: ${extractedText.length}`);
    
    // Analyze with OpenAI (now including unit count for inadimplência analysis)
    console.log("Starting OpenAI analysis...");
    const analysis = await analyzeCondominiumAccounts(extractedText, condominium.units);
    console.log("OpenAI analysis completed:", JSON.stringify(analysis, null, 2));
    
    // Create audit report
    const reportData = {
      auditId,
      totalBalance: analysis.totalBalance ? analysis.totalBalance.toString() : "0",
      totalExpenses: analysis.totalExpenses ? analysis.totalExpenses.toString() : "0",
      biggestExpense: analysis.biggestExpense ? analysis.biggestExpense.toString() : "0",
      biggestExpenseDescription: analysis.biggestExpenseDescription || "Não identificado",
      expenseCategories: analysis.expenseCategories || [],
      inconsistencies: analysis.inconsistencies || [],
      aiAnalysis: analysis.summary || "Análise não disponível",
      // Inadimplência data
      totalUnits: analysis.totalUnits || null,
      paidUnits: analysis.paidUnits || null,
      defaultUnits: analysis.defaultUnits || null,
      defaultRate: analysis.defaultRate ? analysis.defaultRate.toString() : null,
      paidUnitsList: analysis.paidUnitsList || null,
      defaultUnitsList: analysis.defaultUnitsList || null,
    };
    
    console.log("Creating audit report with data:", JSON.stringify(reportData, null, 2));
    await storage.createAuditReport(reportData);
    await storage.updateAuditStatus(auditId, "completed");
    
    console.log(`Audit processing completed for ${auditId}`);
  } catch (error) {
    console.error(`Error processing audit ${auditId}:`, error);
    await storage.updateAuditStatus(auditId, "error");
    throw error;
  }
}
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
      objectStorageService.downloadObjectToResponse(objectFile, res);
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

  // New combined upload and create audit endpoint
  app.post("/api/audits/upload", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const file = req.file;
      const { condominiumId, month, year } = req.body;
      
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      console.log("Processing file upload:", file.originalname, "Size:", file.size);
      
      // Verify user owns the condominium
      const condominium = await storage.getCondominiumById(condominiumId);
      if (!condominium || condominium.ownerId !== userId) {
        console.log("Access denied for user", userId, "to condominium", condominiumId);
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Upload file to object storage
      const objectStorageService = new ObjectStorageService();
      const documentPath = await objectStorageService.uploadObject(file.buffer, file.originalname, userId);
      
      // Create audit record
      const auditData = {
        condominiumId,
        month: parseInt(month),
        year: parseInt(year),
        fileName: file.originalname,
        fileSize: file.size,
        documentPath,
        status: "pending"
      };
      
      const audit = await storage.createAudit(auditData);
      console.log("Audit created:", audit.id);
      
      // Start processing immediately
      console.log("Starting document processing for audit:", audit.id);
      processAuditDocument(audit.id, documentPath).catch(error => {
        console.error("Background processing failed:", error);
        storage.updateAuditStatus(audit.id, "error").catch(console.error);
      });
      
      // Update status to processing
      await storage.updateAuditStatus(audit.id, "processing");
      
      res.status(201).json(audit);
    } catch (error) {
      console.error("Error uploading file and creating audit:", error);
      res.status(500).json({ error: "Failed to upload file and create audit" });
    }
  });

  app.post("/api/audits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const auditData = insertAuditSchema.parse(req.body);
      
      console.log("Creating audit with data:", auditData);
      
      // Verify user owns the condominium
      const condominium = await storage.getCondominiumById(auditData.condominiumId);
      if (!condominium || condominium.ownerId !== userId) {
        console.log("Access denied for user", userId, "to condominium", auditData.condominiumId);
        return res.status(403).json({ message: "Access denied" });
      }
      
      const audit = await storage.createAudit(auditData);
      console.log("Audit created:", audit.id);
      
      // Start processing immediately
      if (audit.documentPath) {
        console.log("Starting document processing for audit:", audit.id);
        // Process document asynchronously
        processAuditDocument(audit.id, audit.documentPath).catch(error => {
          console.error("Background processing failed:", error);
          // Update audit status to error
          storage.updateAuditStatus(audit.id, "error").catch(console.error);
        });
        
        // Update status to processing
        await storage.updateAuditStatus(audit.id, "processing");
      }
      
      res.status(201).json(audit);
    } catch (error) {
      console.error("Error creating audit:", error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Invalid audit data" });
      }
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

  // Reprocess failed audit
  app.post("/api/audits/:id/reprocess", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const auditId = req.params.id;
      
      // Get audit and verify ownership
      const audit = await storage.getAuditById(auditId);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      const condominium = await storage.getCondominiumById(audit.condominiumId);
      if (!condominium || condominium.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!audit.documentPath) {
        return res.status(400).json({ error: "No document found for this audit" });
      }
      
      // Set status to processing and start reprocessing
      await storage.updateAuditStatus(auditId, "processing");
      
      // Start async processing with the stored document path
      processAuditDocument(auditId, "").catch(error => {
        console.error("Error reprocessing audit document:", error);
        storage.updateAuditStatus(auditId, "error");
      });
      
      res.json({ message: "Audit reprocessing started" });
    } catch (error) {
      console.error("Error reprocessing audit:", error);
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

  // Admin routes - User management
  app.get("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/admin/users", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.createUser(req.body);
      res.json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const user = await storage.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteUser(req.params.id);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Admin routes - User-Condominium associations
  app.get("/api/admin/user-condominiums", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const associations = await storage.getAllUserCondominiums();
      res.json(associations);
    } catch (error) {
      console.error("Error fetching associations:", error);
      res.status(500).json({ message: "Failed to fetch associations" });
    }
  });

  app.post("/api/admin/user-condominiums", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const association = await storage.createUserCondominium(req.body);
      res.json(association);
    } catch (error) {
      console.error("Error creating association:", error);
      res.status(500).json({ message: "Failed to create association" });
    }
  });

  app.delete("/api/admin/user-condominiums/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteUserCondominium(req.params.id);
      res.json({ message: "Association deleted successfully" });
    } catch (error) {
      console.error("Error deleting association:", error);
      res.status(500).json({ message: "Failed to delete association" });
    }
  });

  // Admin routes - Audit reports management
  app.get("/api/admin/audit-reports", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const reports = await storage.getAllAuditReports();
      res.json(reports);
    } catch (error) {
      console.error("Error fetching audit reports:", error);
      res.status(500).json({ message: "Failed to fetch audit reports" });
    }
  });

  app.delete("/api/admin/audit-reports/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.claims.sub);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteAuditReport(req.params.id);
      res.json({ message: "Audit report deleted successfully" });
    } catch (error) {
      console.error("Error deleting audit report:", error);
      res.status(500).json({ message: "Failed to delete audit report" });
    }
  });

  // Get audit reports for a specific condominium (for default reports)
  app.get("/api/condominiums/:id/audit-reports", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const condominiumId = req.params.id;
      
      // Verify condominium ownership or admin access
      const condominium = await storage.getCondominiumById(condominiumId);
      if (!condominium) {
        return res.status(404).json({ error: "Condominium not found" });
      }
      
      const currentUser = await storage.getUser(userId);
      const isOwner = condominium.ownerId === userId;
      const isAdmin = currentUser?.role === 'admin';
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Get all audits for this condominium
      const audits = await storage.getAuditsByCondominiumId(condominiumId);
      
      // Get audit reports for each audit
      const auditReports = await Promise.all(
        audits.map(async (audit) => {
          const report = await storage.getAuditReportByAuditId(audit.id);
          return report ? { audit, report } : null;
        })
      );
      
      // Filter out null values and return
      const validReports = auditReports.filter(item => item !== null);
      res.json(validReports);
    } catch (error) {
      console.error("Error fetching condominium audit reports:", error);
      res.status(500).json({ error: "Failed to fetch audit reports" });
    }
  });

  // Download audit PDF
  app.get("/api/audits/:id/download", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const auditId = req.params.id;
      
      // Get audit and verify ownership
      const audit = await storage.getAuditById(auditId);
      if (!audit) {
        return res.status(404).json({ error: "Audit not found" });
      }
      
      const condominium = await storage.getCondominiumById(audit.condominiumId);
      if (!condominium || condominium.ownerId !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      if (!audit.documentPath) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Download from object storage
      const objectStorageService = new ObjectStorageService();
      const fileStream = await objectStorageService.downloadObject(audit.documentPath, userId);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${audit.fileName}"`);
      
      fileStream.pipe(res);
    } catch (error) {
      console.error("Error downloading audit document:", error);
      res.status(500).json({ error: "Failed to download document" });
    }
  });

  // Delete audit
  app.delete("/api/audits/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const auditId = req.params.id;
      
      console.log(`Attempting to delete audit ${auditId} for user ${userId}`);
      
      // Get audit and verify ownership
      const audit = await storage.getAuditById(auditId);
      if (!audit) {
        console.log(`Audit ${auditId} not found`);
        return res.status(404).json({ error: "Audit not found" });
      }
      
      console.log(`Found audit: ${audit.id}, document path: ${audit.documentPath}`);
      
      const condominium = await storage.getCondominiumById(audit.condominiumId);
      if (!condominium || condominium.ownerId !== userId) {
        console.log(`Access denied for user ${userId} to condominium ${audit.condominiumId}`);
        return res.status(403).json({ error: "Access denied" });
      }
      
      console.log(`Access verified for condominium: ${condominium.name}`);
      
      // Delete audit report first (if exists)
      try {
        const report = await storage.getAuditReportByAuditId(auditId);
        if (report) {
          console.log(`Deleting audit report: ${report.id}`);
          await storage.deleteAuditReport(report.id);
          console.log(`Audit report deleted successfully`);
        } else {
          console.log(`No audit report found for audit ${auditId}`);
        }
      } catch (error) {
        console.warn("Failed to delete audit report:", error);
      }
      
      // Delete from object storage if exists
      if (audit.documentPath) {
        try {
          console.log(`Deleting object from storage: ${audit.documentPath}`);
          const objectStorageService = new ObjectStorageService();
          await objectStorageService.deleteObject(audit.documentPath, userId);
          console.log(`Object deleted from storage successfully`);
        } catch (error) {
          console.warn("Failed to delete object from storage:", error);
        }
      } else {
        console.log(`No document path found for audit ${auditId}`);
      }
      
      // Delete audit record
      console.log(`Deleting audit record from database: ${auditId}`);
      await storage.deleteAudit(auditId);
      console.log(`Audit ${auditId} deleted successfully from database`);
      
      res.json({ 
        message: "Audit deleted successfully",
        auditId: auditId,
        deletedDocument: !!audit.documentPath
      });
    } catch (error) {
      console.error("Error deleting audit:", error);
      res.status(500).json({ error: "Failed to delete audit" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
