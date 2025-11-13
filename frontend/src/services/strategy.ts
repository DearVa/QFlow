import { AreaPlugin } from 'rete-area-plugin';
import { NodeEditor, GetSchemes, ClassicPreset } from 'rete';
import type { StrategyNodeGraph, CompiledStrategy } from '../types/strategy';

type Schemes = GetSchemes<ClassicPreset.Node, ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>>;

type AreaExtra = {
    getNodesRect(): DOMRect;
};

export const createStrategyEditor = async (container: HTMLElement): Promise<NodeEditor<Schemes>> => {
    const editor = new NodeEditor<Schemes>();
    const area = new AreaPlugin<Schemes, AreaExtra>(container);
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
