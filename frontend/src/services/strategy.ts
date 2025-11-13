import { AreaPlugin } from 'rete-area-plugin';
import { NodeEditor, GetSchemes, ClassicPreset } from 'rete';
import type { StrategyNodeGraph, CompiledStrategy } from '@/types/strategy';

export type StrategyEditorSchemes = GetSchemes<ClassicPreset.Node, ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>>;

interface AreaExtra {
    getNodesRect(): DOMRect;
}

export const createStrategyEditor = async (container: HTMLElement): Promise<NodeEditor<StrategyEditorSchemes>> => {
    const editor = new NodeEditor<StrategyEditorSchemes>();
    const area = new AreaPlugin<StrategyEditorSchemes, AreaExtra>(container);
    editor.use(area);
    return editor;
};

export const buildStrategyFromNodes = async (graph: StrategyNodeGraph): Promise<CompiledStrategy> => {
    return {
        id: `strategy-${Date.now()}`,
        nodes: graph,
        code: `export default function execute(context) { /* generated */ }`
    };
};
