export interface RuleInput {
  environment: string;
  attribute: string;
  equals: string;
  rolloutPercent: number;
}

export interface FeatureFlag {
  key: string;
  description: string;
  enabled: boolean;
  rules: RuleInput[];
}

export interface EvaluationRequest {
  key: string;
  actorId: string;
  environment: string;
  attributes: Record<string, string>;
}

export class FlagStore {
  private readonly flags = new Map<string, FeatureFlag>();

  createFlag(key: string, description: string, enabled: boolean): FeatureFlag {
    if (this.flags.has(key)) {
      throw new Error(`flag already exists: ${key}`);
    }
    const flag = { key, description, enabled, rules: [] };
    this.flags.set(key, flag);
    return structuredClone(flag);
  }

  addRule(key: string, rule: RuleInput): FeatureFlag {
    if (rule.rolloutPercent < 0 || rule.rolloutPercent > 100) {
      throw new Error("rolloutPercent must be between 0 and 100");
    }
    const current = this.flags.get(key);
    if (!current) {
      throw new Error(`flag not found: ${key}`);
    }
    current.rules.push(rule);
    return structuredClone(current);
  }

  evaluate(input: EvaluationRequest): { enabled: boolean; reason: string } {
    const flag = this.flags.get(input.key);
    if (!flag) {
      throw new Error(`flag not found: ${input.key}`);
    }
    if (!flag.enabled) {
      return { enabled: false, reason: "flag_disabled" };
    }

    for (const rule of flag.rules) {
      if (rule.environment !== input.environment) {
        continue;
      }
      if (input.attributes[rule.attribute] !== rule.equals) {
        continue;
      }
      const bucket = stableBucket(`${input.actorId}:${input.key}:${rule.environment}`);
      return {
        enabled: bucket < rule.rolloutPercent,
        reason: bucket < rule.rolloutPercent ? "rule_match" : "rule_filtered_by_rollout",
      };
    }

    return { enabled: false, reason: "no_matching_rule" };
  }

  listFlags(): FeatureFlag[] {
    return [...this.flags.values()].map((flag) => structuredClone(flag));
  }
}

export function stableBucket(value: string): number {
  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) % 10000;
  }
  return hash % 100;
}
