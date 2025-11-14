import { z } from 'zod';

export const connectionEndpointSchema = z.object({
  nodeId: z.string(),
  portId: z.string()
});

export const strategyNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['condition', 'action', 'risk', 'indicator', 'math']),
  label: z.string(),
  x: z.number(),
  y: z.number(),
  data: z.record(z.any()).default({})
});

export const strategyConnectionSchema = z.object({
  id: z.string(),
  source: connectionEndpointSchema,
  target: connectionEndpointSchema
});

export const strategyGraphSchema = z.object({
  id: z.string(),
  name: z.string(),
  nodes: z.array(strategyNodeSchema),
  connections: z.array(strategyConnectionSchema)
});

