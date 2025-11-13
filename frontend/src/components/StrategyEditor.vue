<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <div
        class="relative h-full w-full overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-slate-950 to-slate-900"
        @contextmenu="captureContextPoint"
      >
        <div ref="canvasRef" class="absolute inset-0" />
        <div class="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
          <div class="size-full bg-[radial-gradient(circle_at_center,_rgba(148,163,184,0.12),_transparent_45%)]" />
        </div>
        <div class="pointer-events-none absolute bottom-4 left-4 text-xs text-muted-foreground">
          Right-click anywhere to add or connect nodes
        </div>
      </div>
    </ContextMenuTrigger>
    <ContextMenuContent class="w-64">
      <ContextMenuLabel class="text-xs uppercase tracking-wide text-muted-foreground">Add node</ContextMenuLabel>
      <ContextMenuSeparator />
      <ContextMenuItem
        v-for="template in nodeTemplates"
        :key="template.key"
        class="flex flex-col items-start gap-1"
        @select="() => addNodeFromTemplate(template)"
      >
        <div class="flex w-full items-center gap-2">
          <component :is="template.icon" class="size-4 text-muted-foreground" />
          <span class="text-sm font-medium">{{ template.label }}</span>
        </div>
        <p class="text-xs text-muted-foreground">{{ template.description }}</p>
      </ContextMenuItem>
    </ContextMenuContent>
  </ContextMenu>
</template>

<script setup lang="ts">
import { type Component, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ClassicPreset, GetSchemes, NodeEditor } from 'rete';
import { AreaExtensions, AreaPlugin } from 'rete-area-plugin';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger
} from '@/components/ui/context-menu';
import type { StrategyNodeGraph, StrategyNode, StrategyNodeType } from '@/types/strategy';
import { Shield, ShoppingCart, TrendingDown } from 'lucide-vue-next';

interface NodePortConfig {
  key: string;
  label: string;
  socket: 'flow' | 'number';
}

interface NodeControlConfig {
  key: string;
  label: string;
  type: 'number' | 'text';
  defaultValue: number | string;
}

interface NodeTemplate {
  key: string;
  type: StrategyNodeType;
  label: string;
  description: string;
  inputs?: NodePortConfig[];
  outputs?: NodePortConfig[];
  controls?: NodeControlConfig[];
  icon: Component;
}

type StrategyEditorSchemes = GetSchemes<ClassicPreset.Node, ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>>;
type ExtendedNode = ClassicPreset.Node & { data?: Record<string, unknown>; position?: [number, number] };

const props = defineProps<{ modelValue: StrategyNodeGraph }>();
const emit = defineEmits<{ (e: 'update:modelValue', value: StrategyNodeGraph): void }>();

const canvasRef = ref<HTMLDivElement | null>(null);
const contextPoint = ref({ x: 320, y: 200 });

const flowSocket = new ClassicPreset.Socket('flow');
const numberSocket = new ClassicPreset.Socket('number');
const sockets = {
  flow: flowSocket,
  number: numberSocket
} as const;

const nodeTemplates: NodeTemplate[] = [
  {
    key: 'price-drop',
    type: 'condition',
    label: 'Price drop trigger',
    description: 'Watch the last window and fire when the drop threshold is met.',
    outputs: [{ key: 'trigger', label: 'Trigger', socket: 'flow' }],
    controls: [
      { key: 'window', label: 'Window (min)', type: 'number', defaultValue: 15 },
      { key: 'drop', label: 'Drop (%)', type: 'number', defaultValue: 1 }
    ],
    icon: TrendingDown
  },
  {
    key: 'market-order',
    type: 'action',
    label: 'Market buy',
    description: 'Send a market order for the selected symbol.',
    inputs: [{ key: 'signal', label: 'Signal', socket: 'flow' }],
    outputs: [{ key: 'fill', label: 'Fill', socket: 'flow' }],
    controls: [{ key: 'size', label: 'Size (%)', type: 'number', defaultValue: 100 }],
    icon: ShoppingCart
  },
  {
    key: 'risk-guard',
    type: 'risk',
    label: 'Risk guard',
    description: 'Attach take profit and stop loss guards to the position.',
    inputs: [{ key: 'entry', label: 'Entry', socket: 'flow' }],
    outputs: [{ key: 'exit', label: 'Exit', socket: 'flow' }],
    controls: [
      { key: 'takeProfit', label: 'Take profit (%)', type: 'number', defaultValue: 10 },
      { key: 'stopLoss', label: 'Stop loss (%)', type: 'number', defaultValue: 5 }
    ],
    icon: Shield
  }
];

let editor: NodeEditor<StrategyEditorSchemes> | null = null;
let area: AreaPlugin<StrategyEditorSchemes> | null = null;
let isSyncingFromEditor = false;
let isApplyingGraph = false;

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const updateGraphFromEditor = () => {
  if (!editor || isApplyingGraph) {
    return;
  }
  isSyncingFromEditor = true;
  const nodes: StrategyNode[] = editor.getNodes().map(node => {
    const current = node as ExtendedNode;
    const [x, y] = current.position ?? [contextPoint.value.x, contextPoint.value.y];
    return {
      id: String(node.id),
      type: (current.data?.type as StrategyNodeType) ?? 'indicator',
      label: node.label,
      x,
      y,
      data: current.data ?? { type: 'indicator' }
    };
  });

  const connections = editor.getConnections().map(connection => ({
    id: String(connection.id),
    source: { nodeId: String(connection.source), portId: connection.sourceOutput as string },
    target: { nodeId: String(connection.target), portId: connection.targetInput as string }
  }));

  const nextGraph: StrategyNodeGraph = {
    id: props.modelValue?.id ?? createId(),
    name: props.modelValue?.name ?? 'Custom strategy',
    nodes,
    connections
  };
  emit('update:modelValue', nextGraph);
  requestAnimationFrame(() => {
    isSyncingFromEditor = false;
  });
};

const bindEditorEvents = () => {
  if (!editor || !area) {
    return;
  }
  editor.addPipe(async context => {
    if (
      context.type === 'nodecreated' ||
      context.type === 'noderemoved' ||
      context.type === 'connectioncreated' ||
      context.type === 'connectionremoved'
    ) {
      updateGraphFromEditor();
    }
    return context;
  });

  area.addPipe(context => {
    if (context.type === 'nodetranslated') {
      updateGraphFromEditor();
    }
    return context;
  });
};

const attachPorts = (node: ExtendedNode, ports: NodePortConfig[] | undefined, type: 'input' | 'output') => {
  if (!ports) {
    return;
  }
  ports.forEach(port => {
    if (type === 'input') {
      node.addInput(port.key as never, new ClassicPreset.Input(sockets[port.socket], port.label));
      return;
    }
    node.addOutput(port.key as never, new ClassicPreset.Output(sockets[port.socket], port.label));
  });
};

const attachControls = (node: ExtendedNode, controls: NodeControlConfig[] | undefined, initialData?: Record<string, unknown>) => {
  if (!controls) {
    node.data = {
      ...initialData,
      type: node.data?.type ?? 'indicator',
      templateKey: node.data?.templateKey ?? ''
    };
    return;
  }
  controls.forEach(control => {
    const controlValue = initialData?.[control.key] ?? control.defaultValue;
    const presetControl = new ClassicPreset.InputControl(control.type, {
      initial: controlValue as never,
      change: value => {
        node.data = {
          ...(node.data ?? {}),
          [control.key]: value,
          type: node.data?.type ?? 'indicator',
          templateKey: (node.data?.templateKey as string) ?? ''
        };
        updateGraphFromEditor();
      }
    });
    node.addControl(control.key as never, presetControl);
    node.data = {
      ...(node.data ?? {}),
      [control.key]: controlValue,
      type: node.data?.type ?? 'indicator',
      templateKey: node.data?.templateKey ?? ''
    };
  });
};

const buildNode = (template: NodeTemplate, overrides?: StrategyNode): ExtendedNode => {
  const node = new ClassicPreset.Node(template.label) as ExtendedNode;
  node.id = overrides?.id ?? createId();
  node.data = {
    ...(overrides?.data ?? {}),
    type: template.type,
    templateKey: template.key
  };
  node.position = [overrides?.x ?? contextPoint.value.x, overrides?.y ?? contextPoint.value.y];
  attachPorts(node, template.inputs, 'input');
  attachPorts(node, template.outputs, 'output');
  attachControls(node, template.controls, overrides?.data);
  return node;
};

const addNodeFromTemplate = async (template: NodeTemplate, overrides?: StrategyNode) => {
  if (!editor) {
    return;
  }
  const node = buildNode(template, overrides);
  await editor.addNode(node);
  if (overrides?.data?.templateKey) {
    node.data = overrides.data;
  }
  updateGraphFromEditor();
};

const connectNodesFromGraph = async (graph: StrategyNodeGraph, nodeMap: Map<string, ExtendedNode>) => {
  if (!editor) {
    return;
  }
  for (const connection of graph.connections) {
    const source = nodeMap.get(connection.source.nodeId);
    const target = nodeMap.get(connection.target.nodeId);
    if (!source || !target) {
      continue;
    }
    const link = new ClassicPreset.Connection(
      source,
      connection.source.portId as keyof typeof source.outputs,
      target,
      connection.target.portId as keyof typeof target.inputs
    );
    await editor.addConnection(link);
  }
};

const loadGraph = async (graph: StrategyNodeGraph) => {
  if (!editor) {
    return;
  }
  isApplyingGraph = true;
  try {
    await editor.clear();
    const nodeMap = new Map<string, ExtendedNode>();
    for (const node of graph.nodes) {
      const template = nodeTemplates.find(template => template.key === (node.data?.templateKey as string)) ??
        nodeTemplates.find(template => template.type === node.type) ??
        nodeTemplates[0];
      const reteNode = buildNode(template, node);
      nodeMap.set(String(reteNode.id), reteNode);
      await editor.addNode(reteNode);
    }
    await connectNodesFromGraph(graph, nodeMap);
    await nextTick(() => {
      if (area && editor) {
        AreaExtensions.zoomAt(area, editor.getNodes());
      }
    });
  } finally {
    isApplyingGraph = false;
  }
};

const captureContextPoint = (event: MouseEvent) => {
  if (!canvasRef.value) {
    return;
  }
  const rect = canvasRef.value.getBoundingClientRect();
  contextPoint.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
};

onMounted(async () => {
  if (!canvasRef.value) {
    return;
  }
  editor = new NodeEditor<StrategyEditorSchemes>();
  area = new AreaPlugin<StrategyEditorSchemes>(canvasRef.value);
  editor.use(area);
  bindEditorEvents();
  await loadGraph(props.modelValue);
});

onBeforeUnmount(() => {
  area?.destroy();
  area = null;
  editor?.destroy?.();
  editor = null;
});

watch(
  () => props.modelValue,
  value => {
    if (!value || isSyncingFromEditor) {
      return;
    }
    void loadGraph(value);
  },
  { deep: true }
);
</script>
