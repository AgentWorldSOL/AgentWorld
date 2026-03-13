export type FeatureFlagName =
  | "v2_jwt_auth"
  | "v2_multi_org"
  | "v2_agent_marketplace"
  | "v2_on_chain_registry"
  | "v2_gpt_integration"
  | "v2_vector_memory"
  | "v2_redis_pubsub"
  | "v2_wallet_adapter"
  | "v2_webhooks"
  | "v2_reputation_system"
  | "v2_bulk_import"
  | "v2_mobile_api"
  | "v2_webrtc_comms"
  | "v2_sol_staking"
  | "v2_new_hierarchy_shape"
  | "v2_unix_timestamps";

export type FlagEnvironment = "development" | "staging" | "production";
export type RolloutStrategy = "all" | "none" | "percentage" | "allowlist";

interface FeatureFlag {
  name: FeatureFlagName;
  description: string;
  strategy: RolloutStrategy;
  percentage?: number;
  allowlist?: number[];
  enabledIn: FlagEnvironment[];
  defaultValue: boolean;
  deprecates?: string;
  addedInVersion: string;
  targetVersion: string;
}

const FLAGS: FeatureFlag[] = [
  {
    name: "v2_jwt_auth",
    description: "Replace session cookies with RS256 signed JWTs",
    strategy: "none",
    enabledIn: ["development"],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
    deprecates: "express-session",
  },
  {
    name: "v2_multi_org",
    description: "Allow users to belong to multiple organizations simultaneously",
    strategy: "none",
    enabledIn: ["development"],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_agent_marketplace",
    description: "Enable agent listing, purchasing, and delegation marketplace",
    strategy: "none",
    enabledIn: [],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_on_chain_registry",
    description: "Register agents on-chain via AgentWorld Solana program",
    strategy: "none",
    enabledIn: [],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_gpt_integration",
    description: "Connect agents to GPT-4 or Claude for autonomous decision-making",
    strategy: "none",
    enabledIn: ["development"],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_vector_memory",
    description: "Persist agent memory across sessions using a vector database",
    strategy: "none",
    enabledIn: [],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_redis_pubsub",
    description: "Replace in-process WebSocket broadcast with Redis pub/sub",
    strategy: "none",
    enabledIn: ["development"],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_wallet_adapter",
    description: "Migrate Phantom integration to WalletAdapter standard",
    strategy: "percentage",
    percentage: 10,
    enabledIn: ["development"],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
    deprecates: "window.solana",
  },
  {
    name: "v2_webhooks",
    description: "Outbound webhook delivery for Zapier and Make.com integrations",
    strategy: "none",
    enabledIn: ["development"],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_reputation_system",
    description: "On-chain agent reputation scores with attestation support",
    strategy: "none",
    enabledIn: [],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_bulk_import",
    description: "Import tasks and agents via CSV or Notion/Linear sync",
    strategy: "allowlist",
    allowlist: [],
    enabledIn: ["development"],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_mobile_api",
    description: "Mobile-optimized API endpoints for React Native client",
    strategy: "none",
    enabledIn: ["development"],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_webrtc_comms",
    description: "Peer-to-peer agent communication via WebRTC data channels",
    strategy: "none",
    enabledIn: [],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_sol_staking",
    description: "SOL staking mechanism for agent compute credit allocation",
    strategy: "none",
    enabledIn: [],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_new_hierarchy_shape",
    description: "Use v2HierarchyNode response shape from hierarchy API",
    strategy: "none",
    enabledIn: ["development"],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
  {
    name: "v2_unix_timestamps",
    description: "Return all timestamps as Unix milliseconds instead of ISO strings",
    strategy: "none",
    enabledIn: ["development"],
    defaultValue: false,
    addedInVersion: "1.1.0",
    targetVersion: "2.0.0",
  },
];

const env = (process.env.NODE_ENV || "development") as FlagEnvironment;

class FeatureFlagService {
  private overrides = new Map<FeatureFlagName, boolean>();

  isEnabled(name: FeatureFlagName, orgId?: number): boolean {
    if (this.overrides.has(name)) return this.overrides.get(name)!;

    const flag = FLAGS.find((f) => f.name === name);
    if (!flag) return false;
    if (!flag.enabledIn.includes(env)) return false;

    switch (flag.strategy) {
      case "all":
        return true;
      case "none":
        return false;
      case "percentage":
        if (!orgId || !flag.percentage) return false;
        return (orgId % 100) < flag.percentage;
      case "allowlist":
        if (!orgId || !flag.allowlist) return false;
        return flag.allowlist.includes(orgId);
      default:
        return flag.defaultValue;
    }
  }

  override(name: FeatureFlagName, value: boolean): void {
    this.overrides.set(name, value);
  }

  clearOverride(name: FeatureFlagName): void {
    this.overrides.delete(name);
  }

  clearAllOverrides(): void {
    this.overrides.clear();
  }

  getAll(orgId?: number): Record<FeatureFlagName, boolean> {
    const result = {} as Record<FeatureFlagName, boolean>;
    for (const flag of FLAGS) {
      result[flag.name] = this.isEnabled(flag.name, orgId);
    }
    return result;
  }

  getV2Flags(orgId?: number): Record<string, boolean> {
    const all = this.getAll(orgId);
    return Object.fromEntries(
      Object.entries(all).filter(([key]) => key.startsWith("v2_"))
    );
  }

  listFlags(): FeatureFlag[] {
    return [...FLAGS];
  }
}

export const featureFlags = new FeatureFlagService();
