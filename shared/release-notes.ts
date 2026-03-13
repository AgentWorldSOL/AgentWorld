export interface ReleaseNote {
  version: string;
  releaseDate: string;
  codename?: string;
  type: "major" | "minor" | "patch" | "prerelease";
  highlights: string[];
  sections: {
    added?: string[];
    changed?: string[];
    deprecated?: string[];
    removed?: string[];
    fixed?: string[];
    security?: string[];
    breaking?: string[];
    performance?: string[];
  };
  migrationGuide?: string;
  contributor?: string[];
}

export const RELEASE_NOTES: ReleaseNote[] = [
  {
    version: "2.0.0-alpha.1",
    releaseDate: "2025-04-01",
    codename: "Genesis",
    type: "prerelease",
    highlights: [
      "Multi-organization support with cross-org agent delegation",
      "JWT-based authentication replacing session cookies",
      "Solana WalletAdapter integration replacing direct window.solana calls",
      "On-chain agent registry via AgentWorld Protocol smart contract",
      "Feature flag system for gradual rollout of all v2 capabilities",
    ],
    sections: {
      added: [
        "Multi-org architecture: users can belong to and switch between organizations",
        "JWT authentication middleware with RS256 key pairs",
        "WalletAdapter standard integration supporting Phantom, Solflare, and Backpack",
        "On-chain agent registry contract address: configurable via AGENT_REGISTRY_ADDRESS env var",
        "Feature flag service with percentage, allowlist, and environment-based rollout strategies",
        "v1-to-v2 data migration engine with readiness validation and dry-run mode",
        "API versioning middleware with X-API-Version header support",
        "Versioned response envelope with unix timestamps in v2 mode",
        "Deprecation headers (Deprecation, Sunset, Link) on legacy v1 routes",
        "Capability array field on agents replacing free-form role descriptions",
        "Agent reputation score field backed by on-chain attestation",
        "Task checklist items as structured sub-task entries",
        "Organization plan tier and agent limit fields",
      ],
      changed: [
        "POST /api/agents now accepts and returns 'capabilities' array",
        "GET /api/organizations/:id/hierarchy returns v2HierarchyNode shape",
        "All v2 API responses wrap data in { apiVersion, timestamp, data, meta } envelope",
        "Timestamps returned as Unix milliseconds in v2 (was ISO 8601 strings in v1)",
        "Agent performance now contributes 80% weight to initial reputation score",
      ],
      deprecated: [
        "window.solana direct access — use WalletAdapter context instead",
        "X-Session-Token header — replaced by Authorization: Bearer <jwt>",
        "GET /api/hierarchy (flat) — replaced by GET /api/organizations/:id/hierarchy",
        "agent.skills string field — replaced by agent.capabilities string array",
      ],
      breaking: [
        "Session cookie authentication is removed; all clients must send JWT",
        "API v1 response shape is preserved only via Accept: application/vnd.agentworld.v1+json",
        "agent.parentId is now required to be null explicitly, not omitted",
        "Transaction amount is returned as string (lamports) not number to avoid float precision loss",
      ],
      security: [
        "RS256 JWT signing replaces symmetric HS256 session secrets",
        "Wallet signature verification now required for all mutating wallet operations",
        "Added PKCE flow for future OAuth provider support",
        "Secrets rotated: SESSION_SECRET deprecated; JWT_PRIVATE_KEY and JWT_PUBLIC_KEY required",
      ],
    },
    migrationGuide: "See server/utils/migrate-v2.ts for automated migration. Run: npx ts-node server/utils/migrate-v2.ts --dry-run first.",
  },
  {
    version: "1.1.0",
    releaseDate: "2025-03-01",
    codename: "Scaffold",
    type: "minor",
    highlights: [
      "24 new utility modules across server and client",
      "Workflow engine with configurable rule-based automation",
      "Analytics aggregator with time series and moving averages",
      "Hierarchy exporter with JSON, CSV, DOT, and Mermaid output",
    ],
    sections: {
      added: [
        "Event bus with typed domain events",
        "Role-based permission guard middleware (5 tiers)",
        "Request context tracking and structured per-request logging",
        "In-memory LRU cache with TTL and pattern invalidation",
        "Audit logging for compliance",
        "Async job queue with dead letter queue support",
        "Metric collector with p50/p95/p99 histogram percentiles",
        "Circuit breaker pattern for external Solana RPC calls",
        "Keyboard shortcut hooks and localStorage sync hooks",
        "Debounce, throttle, pagination, and virtual list hooks",
        "Agent scoring engine with S-F grades and trend tracking",
        "Fuzzy search with field-level weighting",
        "Token bucket rate limiter per endpoint category",
        "Hierarchy exporter (JSON, CSV, DOT, Mermaid)",
        "Notification type system with per-channel delivery rules",
        "Config validator with startup exit on misconfiguration",
        "Clipboard hooks with execCommand fallback",
        "Data export utilities with browser download trigger",
        "Server-side session manager with auto-renewal",
        "Analytics aggregator with time series, growth rates, and moving averages",
        "Shared Zod form validation schemas",
        "Workflow engine with trigger/condition/action DSL",
        "Infinite scroll hook with sentinel observation",
        "Intersection observer hooks for lazy loading",
      ],
      fixed: [
        "Hierarchy builder now handles orphaned agents correctly",
        "WebSocket reconnect no longer fires on intentional disconnect",
        "Task completion timestamps now recorded at actual completion",
        "Wallet balance polling stops when wallet disconnects",
      ],
      performance: [
        "Virtual list hook reduces DOM nodes for large agent lists by ~90%",
        "Debounced search reduces API calls during rapid input",
        "LRU cache for hierarchy trees reduces repeated tree-building overhead",
      ],
    },
  },
  {
    version: "1.0.0",
    releaseDate: "2025-02-01",
    codename: "Origin",
    type: "major",
    highlights: [
      "Full agent management platform with organizational hierarchies",
      "Phantom wallet integration for Solana",
      "Kanban task board with priority and assignment",
      "Real-time WebSocket updates",
      "Docker support",
    ],
    sections: {
      added: [
        "Core agent CRUD with role assignment and parent-child hierarchy",
        "Organizational hierarchy tree with depth calculation",
        "Kanban task board with priority levels and agent assignment",
        "Phantom wallet integration with balance and transaction history",
        "Analytics dashboard with org health score",
        "WebSocket server for real-time status updates",
        "Automation rules engine",
        "REST API with 25+ endpoints",
        "React frontend with 7 pages and 9 UI components",
        "TailwindCSS dark/light theme",
        "In-memory storage with full CRUD",
        "Drizzle ORM schema definitions (PostgreSQL-ready)",
        "Docker multi-stage build and docker-compose",
        "CORS, rate limiting, security headers, input sanitization",
      ],
    },
  },
];

export function getReleaseNote(version: string): ReleaseNote | undefined {
  return RELEASE_NOTES.find((r) => r.version === version);
}

export function getLatestRelease(): ReleaseNote {
  return RELEASE_NOTES[0];
}

export function getReleasesByType(type: ReleaseNote["type"]): ReleaseNote[] {
  return RELEASE_NOTES.filter((r) => r.type === type);
}

export function formatReleaseMarkdown(note: ReleaseNote): string {
  const lines: string[] = [];

  lines.push(`## [${note.version}]${note.codename ? ` — ${note.codename}` : ""} (${note.releaseDate})`);
  lines.push("");

  if (note.highlights.length > 0) {
    lines.push("### Highlights");
    note.highlights.forEach((h) => lines.push(`- ${h}`));
    lines.push("");
  }

  const sectionLabels: Record<string, string> = {
    added: "Added",
    changed: "Changed",
    deprecated: "Deprecated",
    removed: "Removed",
    fixed: "Fixed",
    security: "Security",
    breaking: "Breaking Changes",
    performance: "Performance",
  };

  for (const [key, label] of Object.entries(sectionLabels)) {
    const items = note.sections[key as keyof ReleaseNote["sections"]];
    if (items && items.length > 0) {
      lines.push(`### ${label}`);
      items.forEach((item) => lines.push(`- ${item}`));
      lines.push("");
    }
  }

  if (note.migrationGuide) {
    lines.push("### Migration Guide");
    lines.push(note.migrationGuide);
    lines.push("");
  }

  return lines.join("\n");
}
