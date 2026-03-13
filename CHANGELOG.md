# Changelog

All notable changes to AgentWorld are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] — v2.0.0

### Planned
- Multi-organization support with cross-org agent sharing
- GPT-4 and Claude integration for autonomous agent decision-making
- On-chain agent registry via Solana program (AgentWorld Protocol)
- Real-time collaborative hierarchy editing with conflict resolution
- Agent marketplace for trading and delegating specialized agents
- Advanced analytics with predictive task completion modeling
- Native mobile app (React Native) with Phantom Mobile support
- WebRTC peer-to-peer agent communication layer
- Agent reputation system with on-chain attestations
- Granular RBAC with custom permission sets per organization
- Bulk task import via CSV and Notion/Linear sync
- Zapier and Make.com integration webhooks
- SOL staking for agent compute credits
- Sub-second WebSocket latency with Redis pub/sub
- Agent memory persistence across sessions (vector DB)

### Breaking Changes in v2.0
- `POST /api/agents` now requires `capabilities` array field
- `GET /api/organizations/:id/hierarchy` returns `v2HierarchyNode` shape
- Wallet connect flow migrated to WalletAdapter standard
- Session tokens replaced with signed JWTs (RS256)
- All timestamps now returned as Unix milliseconds (was ISO strings)

---

## [1.1.0] — 2025-03-01

### Added
- Event bus with typed domain events for agents, tasks, wallet, and org lifecycle
- Role-based permission guard middleware with 5 role tiers
- Request context tracking with structured per-request logging
- In-memory cache manager with TTL, LRU eviction, and pattern invalidation
- Audit logging system for compliance and activity tracking
- Async job queue with exponential backoff, retry limits, and dead letter queue
- Metric collector with p50/p95/p99 histogram percentiles
- Retry strategy with circuit breaker pattern for external calls
- Keyboard shortcut hooks for app-wide navigation
- Typed localStorage and sessionStorage hooks with cross-tab sync
- Date utilities including relative time, deadline urgency, and working day calculation
- Debounce and throttle hooks for input performance
- Pagination hook with smart page number windowing
- Agent scoring engine with S–F grade system and trend tracking
- Fuzzy search engine for agents and tasks with field weighting
- Token bucket rate limiting per endpoint category
- Hierarchy exporter supporting JSON, CSV, DOT graph, and Mermaid formats
- Typed notification payload system with per-channel delivery rules
- Zod-based server config validator with startup exit on misconfiguration
- Clipboard read/write hooks with execCommand fallback
- Virtual list hook for windowed rendering of large datasets
- Data export utilities for CSV and JSON with browser download trigger
- Server-side session manager with auto-renewal and per-org limits
- Analytics aggregator with time series, growth rates, and moving averages
- Shared Zod form validation schemas for agents, tasks, orgs, and wallets
- Workflow engine with trigger/condition/action DSL and rule prioritization
- Infinite scroll hook with automatic sentinel observation
- Intersection observer hooks for lazy loading and scroll animations

### Fixed
- Hierarchy tree builder now correctly handles orphaned agents
- WebSocket reconnect logic no longer fires after intentional disconnect
- Task completion timestamps now recorded at actual completion time
- Wallet balance polling no longer runs when wallet is disconnected

---

## [1.0.0] — 2025-02-01

### Added
- Core agent management: create, update, delete, and list agents with role assignment
- Organizational hierarchy tree with parent-child agent relationships
- Kanban task board with priority levels, status tracking, and agent assignment
- Phantom wallet integration for Solana balance checks and transaction recording
- Analytics dashboard with org health score and performance metrics
- Automation rules engine with configurable triggers and actions
- WebSocket server for real-time status updates and notifications
- Hierarchy manager service for tree traversal and depth calculation
- Task scheduler with priority queue and auto-assignment logic
- Wallet connector service with Solana RPC integration
- Agent engine for performance scoring and automation execution
- Notification engine with in-app and WebSocket delivery
- Session-based authentication middleware
- Request validation middleware using Zod schemas
- Structured logging utility with log levels
- In-memory storage with full CRUD for all entities
- REST API with 25+ endpoints across agents, tasks, orgs, and wallet
- React frontend with 7 pages and 9 reusable UI components
- TailwindCSS dark/light theme with system preference detection
- Inter and JetBrains Mono font stack
- Drizzle ORM schema definitions (PostgreSQL-ready)
- Docker support with multi-stage build and docker-compose

### Security
- CORS middleware with origin allowlist
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Rate limiting on API, auth, and wallet endpoints
- Input sanitization utilities for XSS prevention
- Cryptographic utilities for secure token generation

---

[Unreleased]: https://github.com/AgentWorldSOL/AgentWorld/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/AgentWorldSOL/AgentWorld/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/AgentWorldSOL/AgentWorld/releases/tag/v1.0.0
