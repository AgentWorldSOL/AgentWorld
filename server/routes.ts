import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hierarchyManager } from "./services/hierarchy-manager";
import { taskScheduler } from "./services/task-scheduler";
import { agentEngine } from "./services/agent-engine";
import { analyticsService } from "./services/analytics";
import { walletConnector } from "./services/wallet-connector";
import { validateBody } from "./middleware/validation";
import {
  insertOrganizationSchema,
  insertAgentSchema,
  insertTaskSchema,
  insertTransactionSchema,
  insertMessageSchema,
} from "@shared/schema";
import { apiLogger } from "./utils/logger";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get("/api/organizations", async (_req, res) => {
    try {
      const orgs = await storage.getOrganizationsByOwner("default");
      res.json(orgs);
    } catch (error) {
      apiLogger.error("Failed to fetch organizations", {
        error: String(error),
      });
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/organizations/:id", async (req, res) => {
    try {
      const org = await storage.getOrganization(req.params.id);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(org);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/organizations", async (req, res) => {
    try {
      const data = insertOrganizationSchema.parse({
        ...req.body,
        ownerId: "default",
      });
      const org = await storage.createOrganization(data);
      res.status(201).json(org);
    } catch (error) {
      apiLogger.error("Failed to create organization", {
        error: String(error),
      });
      res.status(400).json({ message: String(error) });
    }
  });

  app.patch("/api/organizations/:id", async (req, res) => {
    try {
      const org = await storage.updateOrganization(
        req.params.id,
        req.body,
      );
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(org);
    } catch (error) {
      res.status(400).json({ message: String(error) });
    }
  });

  app.delete("/api/organizations/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteOrganization(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/organizations/:orgId/agents", async (req, res) => {
    try {
      const agents = await storage.getAgentsByOrganization(
        req.params.orgId,
      );
      res.json(agents);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/agents", async (req, res) => {
    try {
      const data = insertAgentSchema.parse(req.body);
      const agent = await storage.createAgent(data);
      apiLogger.info("Agent created", {
        agentId: agent.id,
        role: agent.role,
      });
      res.status(201).json(agent);
    } catch (error) {
      apiLogger.error("Failed to create agent", {
        error: String(error),
      });
      res.status(400).json({ message: String(error) });
    }
  });

  app.patch("/api/agents/:id", async (req, res) => {
    try {
      const agent = await storage.updateAgent(req.params.id, req.body);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json(agent);
    } catch (error) {
      res.status(400).json({ message: String(error) });
    }
  });

  app.delete("/api/agents/:id", async (req, res) => {
    try {
      const children = await storage.getAgentsByParent(req.params.id);
      if (children.length > 0) {
        return res.status(400).json({
          message:
            "Cannot delete agent with subordinates. Reassign them first.",
        });
      }
      const deleted = await storage.deleteAgent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Agent not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(
    "/api/organizations/:orgId/hierarchy",
    async (req, res) => {
      try {
        const agents = await storage.getAgentsByOrganization(
          req.params.orgId,
        );
        const tree = hierarchyManager.buildTree(agents);
        const stats = hierarchyManager.getOrganizationStats(agents);
        res.json({ tree, stats });
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.get("/api/agents/:id/chain", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }
      const agents = await storage.getAgentsByOrganization(
        agent.organizationId,
      );
      hierarchyManager.loadAgents(agents);
      const chain = hierarchyManager.getChainOfCommand(req.params.id);
      res.json(chain);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/agents/:id/reassign", async (req, res) => {
    try {
      const { newParentId } = req.body;
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const agents = await storage.getAgentsByOrganization(
        agent.organizationId,
      );
      hierarchyManager.loadAgents(agents);

      const validation = hierarchyManager.validateReassignment(
        req.params.id,
        newParentId,
      );
      if (!validation.valid) {
        return res
          .status(400)
          .json({ message: validation.reason });
      }

      const updated = await storage.updateAgent(req.params.id, {
        parentAgentId: newParentId,
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ message: String(error) });
    }
  });

  app.get("/api/organizations/:orgId/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasksByOrganization(
        req.params.orgId,
      );
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const data = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(data);
      apiLogger.info("Task created", {
        taskId: task.id,
        title: task.title,
      });
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: String(error) });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const task = await storage.updateTask(req.params.id, req.body);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: String(error) });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTask(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/tasks/:id/suggest-assignment", async (req, res) => {
    try {
      const task = await storage.getTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const agents = await storage.getAgentsByOrganization(
        task.organizationId,
      );
      const allTasks = await storage.getTasksByOrganization(
        task.organizationId,
      );
      const activeAgents = agents.filter(
        (a) => a.status === "active" || a.status === "idle",
      );

      taskScheduler.updateWorkloads(activeAgents, allTasks);
      const suggestion = taskScheduler.suggestAssignment(
        task,
        activeAgents,
      );

      if (!suggestion) {
        return res
          .status(404)
          .json({ message: "No suitable agent found" });
      }

      const agent = await storage.getAgent(suggestion.agentId);
      res.json({ ...suggestion, agent });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(
    "/api/organizations/:orgId/transactions",
    async (req, res) => {
      try {
        const transactions =
          await storage.getTransactionsByOrganization(req.params.orgId);
        res.json(transactions);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post("/api/transactions", async (req, res) => {
    try {
      const data = insertTransactionSchema.parse(req.body);
      const tx = await storage.createTransaction(data);
      apiLogger.info("Transaction created", {
        txId: tx.id,
        type: tx.type,
        amount: tx.amount,
      });
      res.status(201).json(tx);
    } catch (error) {
      res.status(400).json({ message: String(error) });
    }
  });

  app.get(
    "/api/organizations/:orgId/messages",
    async (req, res) => {
      try {
        const messages = await storage.getMessagesByOrganization(
          req.params.orgId,
        );
        res.json(messages);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post("/api/messages", async (req, res) => {
    try {
      const data = insertMessageSchema.parse(req.body);
      const msg = await storage.createMessage(data);
      res.status(201).json(msg);
    } catch (error) {
      res.status(400).json({ message: String(error) });
    }
  });

  app.get(
    "/api/organizations/:orgId/analytics",
    async (req, res) => {
      try {
        const [agents, tasks, transactions] = await Promise.all([
          storage.getAgentsByOrganization(req.params.orgId),
          storage.getTasksByOrganization(req.params.orgId),
          storage.getTransactionsByOrganization(req.params.orgId),
        ]);

        const analytics = analyticsService.computeAgentAnalytics(
          agents,
          tasks,
          transactions,
        );
        res.json(analytics);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/organizations/:orgId/dashboard",
    async (req, res) => {
      try {
        const [agents, tasks, transactions, messages] =
          await Promise.all([
            storage.getAgentsByOrganization(req.params.orgId),
            storage.getTasksByOrganization(req.params.orgId),
            storage.getTransactionsByOrganization(req.params.orgId),
            storage.getMessagesByOrganization(req.params.orgId),
          ]);

        const metrics = analyticsService.computeDashboardMetrics(
          agents,
          tasks,
          transactions,
          messages,
        );
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/organizations/:orgId/health",
    async (req, res) => {
      try {
        const [agents, tasks] = await Promise.all([
          storage.getAgentsByOrganization(req.params.orgId),
          storage.getTasksByOrganization(req.params.orgId),
        ]);

        const health = agentEngine.computeOrganizationHealth(
          agents,
          tasks,
        );
        res.json(health);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.get("/api/agents/:id/report", async (req, res) => {
    try {
      const agent = await storage.getAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({ message: "Agent not found" });
      }

      const [tasks, transactions] = await Promise.all([
        storage.getTasksByOrganization(agent.organizationId),
        storage.getTransactionsByOrganization(agent.organizationId),
      ]);

      const report = analyticsService.generateAgentReport(
        agent,
        tasks,
        transactions,
      );
      res.json(report);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(
    "/api/organizations/:orgId/recommendations",
    async (req, res) => {
      try {
        const org = await storage.getOrganization(req.params.orgId);
        if (!org) {
          return res
            .status(404)
            .json({ message: "Organization not found" });
        }

        const agents = await storage.getAgentsByOrganization(
          req.params.orgId,
        );
        const recommended = agentEngine.getRecommendedRole(
          agents,
          org.industry || "Technology",
        );
        res.json({ recommendedRoles: recommended });
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    },
  );

  app.post("/api/wallet/connect", async (req, res) => {
    try {
      const { address, provider } = req.body;
      if (!address) {
        return res
          .status(400)
          .json({ message: "Wallet address required" });
      }
      const state = await walletConnector.connectWallet(
        "default",
        address,
        provider,
      );
      res.json(state);
    } catch (error) {
      res.status(400).json({ message: String(error) });
    }
  });

  app.get("/api/wallet/balance/:address", async (req, res) => {
    try {
      const balance = await walletConnector.getBalance(
        req.params.address,
      );
      res.json(balance);
    } catch (error) {
      res.status(400).json({ message: String(error) });
    }
  });

  app.post("/api/wallet/transfer", async (req, res) => {
    try {
      const { fromAddress, toAddress, amount } = req.body;
      const instruction =
        await walletConnector.buildTransferInstruction(
          fromAddress,
          toAddress,
          amount,
        );
      res.json(instruction);
    } catch (error) {
      res.status(400).json({ message: String(error) });
    }
  });

  app.get("/api/wallet/verify/:signature", async (req, res) => {
    try {
      const result = await walletConnector.verifyTransaction(
        req.params.signature,
      );
      if (!result) {
        return res
          .status(404)
          .json({ message: "Transaction not found" });
      }
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: String(error) });
    }
  });

  app.get("/api/automation/rules", async (_req, res) => {
    const rules = agentEngine.getAutomationRules();
    res.json(rules);
  });

  app.patch("/api/automation/rules/:id", async (req, res) => {
    const { enabled } = req.body;
    const success = agentEngine.toggleAutomationRule(
      req.params.id,
      enabled,
    );
    if (!success) {
      return res.status(404).json({ message: "Rule not found" });
    }
    res.json({ success: true });
  });

  return httpServer;
}
