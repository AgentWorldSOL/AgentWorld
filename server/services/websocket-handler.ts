import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { createLogger } from "../utils/logger";

const logger = createLogger("websocket");

interface WSClient {
  ws: WebSocket;
  userId: string;
  organizationId: string;
  subscribedChannels: Set<string>;
  connectedAt: Date;
  lastPingAt: Date;
}

interface WSMessage {
  type: string;
  channel?: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

interface BroadcastOptions {
  organizationId: string;
  channel?: string;
  excludeUserId?: string;
}

export class WebSocketHandler {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, WSClient> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private readonly HEARTBEAT_MS = 30_000;
  private readonly PONG_TIMEOUT_MS = 10_000;

  initialize(server: Server, path: string = "/ws"): void {
    this.wss = new WebSocketServer({ server, path });

    this.wss.on("connection", (ws, req) => {
      const clientId = this.generateClientId();
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const userId = url.searchParams.get("userId") || "anonymous";
      const orgId = url.searchParams.get("orgId") || "";

      const client: WSClient = {
        ws,
        userId,
        organizationId: orgId,
        subscribedChannels: new Set(["global"]),
        connectedAt: new Date(),
        lastPingAt: new Date(),
      };

      this.clients.set(clientId, client);

      logger.info("Client connected", {
        clientId,
        userId,
        organizationId: orgId,
        totalClients: this.clients.size,
      });

      this.sendToClient(client, {
        type: "connection_ack",
        payload: {
          clientId,
          message: "Connected to AgentWorld WebSocket",
        },
        timestamp: Date.now(),
      });

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data.toString()) as WSMessage;
          this.handleMessage(clientId, client, message);
        } catch (error) {
          this.sendToClient(client, {
            type: "error",
            payload: { message: "Invalid message format" },
            timestamp: Date.now(),
          });
        }
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        logger.info("Client disconnected", {
          clientId,
          totalClients: this.clients.size,
        });
      });

      ws.on("error", (error) => {
        logger.error("WebSocket error", {
          clientId,
          error: String(error),
        });
        this.clients.delete(clientId);
      });

      ws.on("pong", () => {
        client.lastPingAt = new Date();
      });
    });

    this.startHeartbeat();

    logger.info("WebSocket server initialized", { path });
  }

  private handleMessage(
    clientId: string,
    client: WSClient,
    message: WSMessage,
  ): void {
    switch (message.type) {
      case "subscribe":
        if (message.channel) {
          client.subscribedChannels.add(message.channel);
          this.sendToClient(client, {
            type: "subscribed",
            channel: message.channel,
            payload: {
              message: `Subscribed to ${message.channel}`,
            },
            timestamp: Date.now(),
          });
        }
        break;

      case "unsubscribe":
        if (message.channel) {
          client.subscribedChannels.delete(message.channel);
          this.sendToClient(client, {
            type: "unsubscribed",
            channel: message.channel,
            payload: {
              message: `Unsubscribed from ${message.channel}`,
            },
            timestamp: Date.now(),
          });
        }
        break;

      case "agent_action":
        this.broadcastToOrganization({
          type: "agent_update",
          payload: message.payload,
          timestamp: Date.now(),
        }, {
          organizationId: client.organizationId,
          excludeUserId: client.userId,
        });
        break;

      case "task_update":
        this.broadcastToOrganization({
          type: "task_changed",
          payload: message.payload,
          timestamp: Date.now(),
        }, {
          organizationId: client.organizationId,
        });
        break;

      case "chat_message":
        this.broadcastToOrganization({
          type: "new_message",
          payload: {
            ...message.payload,
            fromUserId: client.userId,
          },
          timestamp: Date.now(),
        }, {
          organizationId: client.organizationId,
        });
        break;

      case "ping":
        this.sendToClient(client, {
          type: "pong",
          payload: {},
          timestamp: Date.now(),
        });
        break;

      default:
        logger.warn("Unknown message type", {
          clientId,
          type: message.type,
        });
    }
  }

  private sendToClient(client: WSClient, message: WSMessage): void {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  broadcastToOrganization(
    message: WSMessage,
    options: BroadcastOptions,
  ): void {
    let sent = 0;
    for (const [, client] of this.clients) {
      if (client.organizationId !== options.organizationId) continue;
      if (
        options.excludeUserId &&
        client.userId === options.excludeUserId
      )
        continue;
      if (
        options.channel &&
        !client.subscribedChannels.has(options.channel)
      )
        continue;

      this.sendToClient(client, message);
      sent++;
    }

    logger.debug("Broadcast sent", {
      orgId: options.organizationId,
      type: message.type,
      recipients: sent,
    });
  }

  broadcastAll(message: WSMessage): void {
    for (const [, client] of this.clients) {
      this.sendToClient(client, message);
    }
  }

  notifyAgentCreated(
    organizationId: string,
    agent: Record<string, unknown>,
  ): void {
    this.broadcastToOrganization(
      {
        type: "agent_created",
        payload: { agent },
        timestamp: Date.now(),
      },
      { organizationId },
    );
  }

  notifyTaskAssigned(
    organizationId: string,
    task: Record<string, unknown>,
    agentId: string,
  ): void {
    this.broadcastToOrganization(
      {
        type: "task_assigned",
        payload: { task, agentId },
        timestamp: Date.now(),
      },
      { organizationId },
    );
  }

  notifyTransactionCompleted(
    organizationId: string,
    transaction: Record<string, unknown>,
  ): void {
    this.broadcastToOrganization(
      {
        type: "transaction_completed",
        payload: { transaction },
        timestamp: Date.now(),
      },
      { organizationId },
    );
  }

  notifyPerformanceUpdate(
    organizationId: string,
    agentId: string,
    score: number,
  ): void {
    this.broadcastToOrganization(
      {
        type: "performance_update",
        payload: { agentId, score },
        timestamp: Date.now(),
      },
      { organizationId },
    );
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();

      for (const [clientId, client] of this.clients) {
        const timeSinceLastPong =
          now - client.lastPingAt.getTime();

        if (timeSinceLastPong > this.HEARTBEAT_MS + this.PONG_TIMEOUT_MS) {
          logger.warn("Client timed out", { clientId });
          client.ws.terminate();
          this.clients.delete(clientId);
          continue;
        }

        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      }
    }, this.HEARTBEAT_MS);
  }

  getConnectedClients(): {
    total: number;
    byOrganization: Record<string, number>;
  } {
    const byOrg: Record<string, number> = {};
    for (const [, client] of this.clients) {
      const orgId = client.organizationId || "unassigned";
      byOrg[orgId] = (byOrg[orgId] || 0) + 1;
    }

    return {
      total: this.clients.size,
      byOrganization: byOrg,
    };
  }

  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    for (const [, client] of this.clients) {
      this.sendToClient(client, {
        type: "server_shutdown",
        payload: { message: "Server is shutting down" },
        timestamp: Date.now(),
      });
      client.ws.close();
    }

    this.clients.clear();

    if (this.wss) {
      this.wss.close();
    }

    logger.info("WebSocket server shut down");
  }
}

export const wsHandler = new WebSocketHandler();
