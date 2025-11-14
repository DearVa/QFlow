<template>
  <ContextMenu>
    <ContextMenuTrigger as-child>
      <div
        class="relative h-full w-full overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-slate-950 to-slate-900"
        @contextmenu="captureContextPoint"
      >
        <div class="hidden ring-2 ring-offset-2 ring-sky-400 ring-emerald-400" aria-hidden="true"></div>
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
const pendingLink = ref<{ nodeId: string; portId: string; direction: 'input' | 'output' } | null>(null);

interface ConnectionViewState {
  path: SVGPathElement;
  svg: SVGSVGElement;
  connection: ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>;
}

const portElements = new Map<string, HTMLElement>();
const connectionElements = new Map<string, ConnectionViewState>();

const handleWindowResize = () => {
  refreshAllConnections();
};

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

const portKey = (nodeId: string, direction: 'input' | 'output', portId: string) => `${nodeId}:${direction}:${portId}`;

const removePortsForNode = (nodeId: string) => {
  Array.from(portElements.keys())
    .filter(key => key.startsWith(`${nodeId}:`))
    .forEach(key => portElements.delete(key));
};

const registerPortElement = (
  nodeId: string,
  direction: 'input' | 'output',
  portId: string,
  element: HTMLElement
) => {
  element.dataset.nodeId = nodeId;
  element.dataset.portId = portId;
  element.dataset.direction = direction;
  portElements.set(portKey(nodeId, direction, portId), element);
};

const updatePortHighlights = () => {
  const pending = pendingLink.value;
  portElements.forEach(element => {
    const { nodeId, portId, direction } = element.dataset;
    const isActive = Boolean(
      pending &&
      nodeId &&
      portId &&
      direction === pending.direction &&
      pending.nodeId === nodeId &&
      pending.portId === portId
    );
    element.classList.toggle('ring-2', isActive);
    element.classList.toggle('ring-offset-2', isActive);
    element.classList.toggle('ring-sky-400', isActive && direction === 'output');
    element.classList.toggle('ring-emerald-400', isActive && direction === 'input');
  });
};

const getPortPosition = (nodeId: string, direction: 'input' | 'output', portId: string) => {
  const element = portElements.get(portKey(nodeId, direction, portId));
  if (!element || !canvasRef.value) {
    return null;
  }
  const anchorRect = element.getBoundingClientRect();
  const canvasRect = canvasRef.value.getBoundingClientRect();
  return {
    x: anchorRect.left - canvasRect.left + anchorRect.width / 2,
    y: anchorRect.top - canvasRect.top + anchorRect.height / 2
  };
};

const buildPath = (start: { x: number; y: number }, end: { x: number; y: number }) => {
  const offset = Math.max(Math.abs(end.x - start.x) * 0.5, 40);
  return `M${start.x},${start.y} C${start.x + offset},${start.y} ${end.x - offset},${end.y} ${end.x},${end.y}`;
};

const refreshConnectionPath = (connectionId: string) => {
  const record = connectionElements.get(connectionId);
  if (!record || !canvasRef.value) {
    return;
  }
  const { connection, path, svg } = record;
  const source = getPortPosition(String(connection.source), 'output', connection.sourceOutput as string);
  const target = getPortPosition(String(connection.target), 'input', connection.targetInput as string);
  if (!source || !target) {
    return;
  }
  const width = canvasRef.value.clientWidth;
  const height = canvasRef.value.clientHeight;
  svg.setAttribute('width', `${width}`);
  svg.setAttribute('height', `${height}`);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  path.setAttribute('d', buildPath(source, target));
};

const refreshAllConnections = () => {
  requestAnimationFrame(() => {
    connectionElements.forEach((_, id) => refreshConnectionPath(id));
  });
};

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

const finalizeConnection = async (
  source: { nodeId: string; portId: string },
  target: { nodeId: string; portId: string }
) => {
  if (!editor) {
    return;
  }
  const sourceNode = editor.getNode(source.nodeId as never) as ExtendedNode | undefined;
  const targetNode = editor.getNode(target.nodeId as never) as ExtendedNode | undefined;
  if (!sourceNode || !targetNode) {
    return;
  }
  const connection = new ClassicPreset.Connection(
    sourceNode,
    source.portId as keyof typeof sourceNode.outputs,
    targetNode,
    target.portId as keyof typeof targetNode.inputs
  );
  await editor.addConnection(connection);
};

const handlePortClick = async (nodeId: string, portId: string, direction: 'input' | 'output') => {
  if (!editor) {
    return;
  }
  const current = pendingLink.value;
  if (!current) {
    pendingLink.value = { nodeId, portId, direction };
    updatePortHighlights();
    return;
  }
  if (current.direction === direction) {
    pendingLink.value = { nodeId, portId, direction };
    updatePortHighlights();
    return;
  }
  const source = direction === 'input' ? current : { nodeId, portId, direction };
  const target = direction === 'input' ? { nodeId, portId, direction } : current;
  await finalizeConnection({ nodeId: source.nodeId, portId: source.portId }, { nodeId: target.nodeId, portId: target.portId });
  pendingLink.value = null;
  updatePortHighlights();
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
      refreshAllConnections();
    }
    if (context.type === 'translated' || context.type === 'zoomed' || context.type === 'resized') {
      refreshAllConnections();
    }
    return context;
  });
};

const bindRenderer = () => {
  if (!area) {
    return;
  }
  area.addPipe(context => {
    if (!context || typeof context !== 'object' || !('type' in context)) {
      return context;
    }
    if (context.type === 'render' && context.data.type === 'node') {
      renderNodeElement(context.data.element, context.data.payload as ExtendedNode);
    }
    if (context.type === 'render' && context.data.type === 'connection') {
      renderConnectionElement(context.data.element, context.data.payload as ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>);
    }
    if (context.type === 'noderemoved') {
      const removedId = String(context.data.id);
      removePortsForNode(removedId);
      if (pendingLink.value?.nodeId === removedId) {
        pendingLink.value = null;
      }
      refreshAllConnections();
    }
    if (context.type === 'connectionremoved') {
      connectionElements.delete(String(context.data.id));
      refreshAllConnections();
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
  refreshAllConnections();
};

const getTemplateForNode = (node: StrategyNode) => {
  return nodeTemplates.find(template => template.key === (node.data?.templateKey as string))
    ?? nodeTemplates.find(template => template.type === node.type)
    ?? nodeTemplates[0];
};

const createPortAnchor = (
  node: ExtendedNode,
  port: NodePortConfig,
  direction: 'input' | 'output'
) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `group flex items-center gap-2 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 transition hover:text-slate-100 ${direction === 'output' ? 'justify-end' : ''}`;
  const anchor = document.createElement('span');
  anchor.className = 'size-3 rounded-full border border-slate-500 shadow-md shadow-black/40 transition group-hover:scale-110';
  anchor.classList.add(direction === 'output' ? 'bg-sky-400/70' : 'bg-emerald-400/70');
  const label = document.createElement('span');
  label.textContent = port.label ?? port.key;
  label.className = 'text-[10px] tracking-wide';
  const handleClick = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    void handlePortClick(String(node.id), port.key, direction);
  };
  button.addEventListener('click', handleClick);
  if (direction === 'input') {
    button.appendChild(anchor);
    button.appendChild(label);
  } else {
    button.appendChild(label);
    button.appendChild(anchor);
  }
  registerPortElement(String(node.id), direction, port.key, anchor);
  return button;
};

const renderNodeElement = (element: HTMLElement, node: ExtendedNode) => {
  removePortsForNode(String(node.id));
  element.innerHTML = '';
  element.className = 'pointer-events-auto select-none';
  const template = getTemplateForNode({
    id: String(node.id),
    type: (node.data?.type as StrategyNodeType) ?? 'indicator',
    label: node.label,
    x: node.position?.[0] ?? contextPoint.value.x,
    y: node.position?.[1] ?? contextPoint.value.y,
    data: node.data ?? {}
  });
  const wrapper = document.createElement('div');
  wrapper.className = 'min-w-[240px] max-w-xs rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 text-left text-slate-100 shadow-2xl shadow-black/40 backdrop-blur';
  const header = document.createElement('div');
  header.className = 'flex items-center justify-between gap-2 text-sm font-semibold text-slate-100';
  header.textContent = template.label;
  const badge = document.createElement('span');
  badge.className = 'rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-400';
  badge.textContent = template.type;
  header.appendChild(badge);
  wrapper.appendChild(header);
  if (template.description) {
    const description = document.createElement('p');
    description.className = 'mt-2 text-xs text-slate-400';
    description.textContent = template.description;
    wrapper.appendChild(description);
  }
  if (template.controls?.length) {
    const controlsWrapper = document.createElement('div');
    controlsWrapper.className = 'mt-4 flex flex-col gap-3';
    template.controls.forEach(control => {
      const controlWrapper = document.createElement('label');
      controlWrapper.className = 'flex flex-col gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400';
      controlWrapper.textContent = control.label;
      const input = document.createElement('input');
      input.type = control.type === 'number' ? 'number' : 'text';
      const value = (node.data?.[control.key] as number | string | undefined) ?? control.defaultValue;
      input.value = String(value);
      input.className = 'rounded-lg border border-slate-800 bg-slate-900/70 px-2 py-1 text-sm text-slate-100 focus:border-slate-500 focus:outline-none';
      input.addEventListener('input', event => {
        const target = event.target as HTMLInputElement;
        const nextValue = control.type === 'number' ? Number(target.value) : target.value;
        node.data = {
          ...(node.data ?? {}),
          [control.key]: nextValue,
          type: template.type,
          templateKey: template.key
        };
        updateGraphFromEditor();
      });
      controlWrapper.appendChild(input);
      controlsWrapper.appendChild(controlWrapper);
    });
    wrapper.appendChild(controlsWrapper);
  }
  const portsWrapper = document.createElement('div');
  portsWrapper.className = 'mt-4 flex items-start justify-between gap-4';
  const inputsColumn = document.createElement('div');
  inputsColumn.className = 'flex flex-col gap-2';
  template.inputs?.forEach(port => {
    inputsColumn.appendChild(createPortAnchor(node, port, 'input'));
  });
  const outputsColumn = document.createElement('div');
  outputsColumn.className = 'flex flex-col gap-2';
  template.outputs?.forEach(port => {
    outputsColumn.appendChild(createPortAnchor(node, port, 'output'));
  });
  portsWrapper.appendChild(inputsColumn);
  portsWrapper.appendChild(outputsColumn);
  wrapper.appendChild(portsWrapper);
  element.appendChild(wrapper);
  updatePortHighlights();
  refreshAllConnections();
};

const renderConnectionElement = (
  element: HTMLElement,
  connection: ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
) => {
  element.innerHTML = '';
  element.className = 'pointer-events-none absolute inset-0 overflow-visible';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'pointer-events-none overflow-visible');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#38bdf8');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(path);
  element.appendChild(svg);
  connectionElements.set(String(connection.id), { path, svg, connection });
  refreshConnectionPath(String(connection.id));
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
      const template = getTemplateForNode(node);
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
  bindRenderer();
  window.addEventListener('resize', handleWindowResize);
  await loadGraph(props.modelValue);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleWindowResize);
  area?.destroy();
  area = null;
  editor?.destroy?.();
  editor = null;
  portElements.clear();
  connectionElements.clear();
  pendingLink.value = null;
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

watch(pendingLink, () => {
  updatePortHighlights();
});
</script>
