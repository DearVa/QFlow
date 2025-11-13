import type { AreaPlugin } from 'rete-area-plugin';
import { createArea } from 'rete-area-plugin';
import { createEditor, type NodeEditor } from 'rete';
import type { StrategyNodeGraph, CompiledStrategy } from '../types/strategy';

export const createStrategyEditor = async (container: HTMLElement): Promise<NodeEditor> => {
  const editor = createEditor();
  const area = createArea({ parent: container });
  await area.add(editor as unknown as AreaPlugin<any, any>);
  return editor as unknown as NodeEditor;
};

export const buildStrategyFromNodes = async (graph: StrategyNodeGraph): Promise<CompiledStrategy> => {
  return {
    id: `strategy-${Date.now()}`,
    nodes: graph,
    code: `export default function execute(context) { /* generated */ }`
  };
};
