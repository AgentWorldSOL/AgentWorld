export interface OrganizationConfig {
  general: {
    name: string;
    description: string;
    timezone: string;
    locale: string;
  };
  agents: {
    maxAgentsPerOrg: number;
    maxTasksPerAgent: number;
    autoAssignTasks: boolean;
    defaultRole: string;
    idleTimeoutMinutes: number;
  };
  tasks: {
    maxOpenTasks: number;
    defaultPriority: string;
    autoEscalateAfterHours: number;
    requireAssignee: boolean;
    allowSelfAssign: boolean;
  };
  wallet: {
    requireApprovalAbove: number;
    dailyTransactionLimit: number;
    allowedOperations: string[];
    notifyOnTransaction: boolean;
  };
  notifications: {
    enableEmail: boolean;
    enableWebSocket: boolean;
    enableSlack: boolean;
    digestFrequency: "realtime" | "hourly" | "daily";
    quietHoursStart: number;
    quietHoursEnd: number;
  };
  security: {
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
    requireMfa: boolean;
    ipWhitelist: string[];
    auditLogRetentionDays: number;
  };
}

const DEFAULT_CONFIG: OrganizationConfig = {
  general: {
    name: "Untitled Organization",
    description: "",
    timezone: "UTC",
    locale: "en-US",
  },
  agents: {
    maxAgentsPerOrg: 50,
    maxTasksPerAgent: 10,
    autoAssignTasks: false,
    defaultRole: "member",
    idleTimeoutMinutes: 30,
  },
  tasks: {
    maxOpenTasks: 200,
    defaultPriority: "medium",
    autoEscalateAfterHours: 24,
    requireAssignee: false,
    allowSelfAssign: true,
  },
  wallet: {
    requireApprovalAbove: 100,
    dailyTransactionLimit: 1000,
    allowedOperations: ["transfer", "stake", "swap"],
    notifyOnTransaction: true,
  },
  notifications: {
    enableEmail: false,
    enableWebSocket: true,
    enableSlack: false,
    digestFrequency: "realtime",
    quietHoursStart: 22,
    quietHoursEnd: 8,
  },
  security: {
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
    requireMfa: false,
    ipWhitelist: [],
    auditLogRetentionDays: 90,
  },
};

export function createDefaultConfig(
  overrides: Partial<OrganizationConfig> = {}
): OrganizationConfig {
  return deepMerge(DEFAULT_CONFIG, overrides);
}

export function validateConfig(config: Partial<OrganizationConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (config.agents) {
    if (config.agents.maxAgentsPerOrg !== undefined) {
      if (config.agents.maxAgentsPerOrg < 1 || config.agents.maxAgentsPerOrg > 500) {
        errors.push("maxAgentsPerOrg must be between 1 and 500");
      }
    }
    if (config.agents.maxTasksPerAgent !== undefined) {
      if (config.agents.maxTasksPerAgent < 1 || config.agents.maxTasksPerAgent > 50) {
        errors.push("maxTasksPerAgent must be between 1 and 50");
      }
    }
  }

  if (config.tasks) {
    if (config.tasks.maxOpenTasks !== undefined) {
      if (config.tasks.maxOpenTasks < 1 || config.tasks.maxOpenTasks > 10000) {
        errors.push("maxOpenTasks must be between 1 and 10000");
      }
    }
  }

  if (config.wallet) {
    if (config.wallet.dailyTransactionLimit !== undefined) {
      if (config.wallet.dailyTransactionLimit < 0) {
        errors.push("dailyTransactionLimit cannot be negative");
      }
    }
  }

  if (config.security) {
    if (config.security.sessionTimeoutMinutes !== undefined) {
      if (config.security.sessionTimeoutMinutes < 5) {
        errors.push("sessionTimeoutMinutes must be at least 5");
      }
    }
    if (config.security.maxLoginAttempts !== undefined) {
      if (config.security.maxLoginAttempts < 1) {
        errors.push("maxLoginAttempts must be at least 1");
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const targetVal = target[key];
      const sourceVal = source[key];

      if (
        targetVal &&
        sourceVal &&
        typeof targetVal === "object" &&
        typeof sourceVal === "object" &&
        !Array.isArray(targetVal) &&
        !Array.isArray(sourceVal)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetVal as Record<string, unknown>,
          sourceVal as Record<string, unknown>
        );
      } else {
        (result as Record<string, unknown>)[key] = sourceVal;
      }
    }
  }

  return result;
}
