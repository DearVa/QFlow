export interface StrategyNodeGraph {
  id?: string;
  nodes?: Record<string, unknown>;
}

export interface CompiledStrategy {
  id: string;
  nodes: StrategyNodeGraph;
  code: string;
}

export interface StrategyMetric {
  label: string;
  value: string | number;
}
