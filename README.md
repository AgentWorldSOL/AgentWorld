# AgentWorld

AI Agent Management Platform for creating, organizing, and orchestrating autonomous agents with hierarchical roles, task assignment, and Solana wallet integration.

## Features

- **Agent Management** — Create and manage AI agents with specialized roles (CEO, CTO, CFO, CMO, COO, Engineering Lead, etc.)
- **Organizational Hierarchy** — Build and visualize hierarchical org structures with parent-child agent relationships
- **Task Board** — Kanban-style task management with priority levels, status tracking, and agent assignment
- **Wallet Integration** — Connect Phantom wallets for Solana-based financial operations and transaction tracking
- **Analytics Dashboard** — Real-time performance metrics, health scores, and organizational insights
- **Automation Engine** — Rule-based automation for task assignment, notifications, and agent coordination
- **Real-time Updates** — WebSocket-powered live notifications and status changes

## Tech Stack

- **Frontend:** React 18, TypeScript, TailwindCSS, shadcn/ui, Wouter, TanStack React Query
- **Backend:** Express.js, TypeScript, Drizzle ORM, WebSocket (ws)
- **Blockchain:** Solana Web3.js, Phantom Wallet adapter
- **Validation:** Zod schemas with drizzle-zod integration
- **Icons:** Lucide React, React Icons

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- PostgreSQL (optional, defaults to in-memory storage)

### Installation

```bash
git clone https://github.com/AgentWorldSOL/AgentWorld.git
cd AgentWorld
npm install
```

### Development

```bash
npm run dev
```

The development server starts on `http://localhost:5000` with hot module replacement enabled.

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
shared/                  # Shared types and schemas
  schema.ts              # Database schemas (Drizzle ORM)
  constants.ts           # Role/status/priority enums
  validators.ts          # Validation utilities
server/                  # Backend
  index.ts               # Express entry point
  routes.ts              # REST API endpoints
  storage.ts             # Storage interface
  services/              # Business logic services
    agent-engine.ts
    analytics.ts
    hierarchy-manager.ts
    task-scheduler.ts
    wallet-connector.ts
    websocket-handler.ts
    notification-engine.ts
  middleware/             # Express middleware
  utils/                 # Server utilities
client/                  # Frontend
  src/
    pages/               # Route pages
    components/          # React components
    hooks/               # Custom hooks
    lib/                 # Utility functions
```

## API Reference

### Organizations
- `GET /api/organizations` — List organizations
- `POST /api/organizations` — Create organization
- `GET /api/organizations/:id/hierarchy` — Get org hierarchy tree
- `GET /api/organizations/:id/analytics` — Get org analytics
- `GET /api/organizations/:id/dashboard` — Get dashboard summary

### Agents
- `GET /api/agents` — List agents (filter by orgId, role, status)
- `POST /api/agents` — Create agent
- `PATCH /api/agents/:id` — Update agent
- `DELETE /api/agents/:id` — Delete agent

### Tasks
- `GET /api/tasks` — List tasks (filter by orgId, status, assignee)
- `POST /api/tasks` — Create task
- `PATCH /api/tasks/:id` — Update task
- `DELETE /api/tasks/:id` — Delete task

### Wallet
- `POST /api/wallet/connect` — Connect Phantom wallet
- `GET /api/wallet/balance/:address` — Get SOL balance

### Transactions
- `GET /api/transactions` — List transactions
- `POST /api/transactions` — Record transaction

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | In-memory |
| `SESSION_SECRET` | Session encryption key | Required |

## License

MIT
