import type { CompiledStrategy, StrategyNodeGraph, StrategyNode } from '@/types/strategy';

const describeNode = (node: StrategyNode): string => {
  const parts = Object.entries(node.data ?? {})
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');
  return `// ${node.label} (${node.type})${parts ? ` => ${parts}` : ''}`;
};

export const buildStrategyFromNodes = async (graph: StrategyNodeGraph): Promise<CompiledStrategy> => {
  const normalizedGraph: StrategyNodeGraph = {
    id: graph.id,
    name: graph.name,
    nodes: graph.nodes,
    connections: graph.connections
  };
  const nodeDescriptions = normalizedGraph.nodes.map(describeNode).join('\n');
  const code = `export default async function execute(ctx) {\n${nodeDescriptions}\n  return ctx;\n}`;

  return {
    id: normalizedGraph.id || `strategy-${Date.now()}`,
    nodes: normalizedGraph,
    code
  };
};
