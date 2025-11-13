export type StrategyNodeType = 'condition' | 'action' | 'risk' | 'indicator' | 'math';

export interface StrategyNode {
  id: string;
  type: StrategyNodeType;
  label: string;
  x: number;
  y: number;
  data: Record<string, unknown>;
}

export interface StrategyConnectionEndpoint {
  nodeId: string;
  portId: string;
}

export interface StrategyConnection {
  id: string;
  source: StrategyConnectionEndpoint;
  target: StrategyConnectionEndpoint;
}

export interface StrategyNodeGraph {
  id: string;
  name: string;
  nodes: StrategyNode[];
  connections: StrategyConnection[];
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
