// Server-side validation for new sample requests (mirrors the wizard's rules so the API can't be bypassed).
import { z } from 'zod';
import { SITES, DEPARTMENTS, PRODUCTS, CONTAINERS, PURPOSES, FLAM_CLASSES, STORAGE, PRIORITIES, GAS_PRODUCTS } from '../shared/rules.js';
import { bad } from './http.js';

const oneOf = (list, msg) => z.string().refine((v) => list.includes(v), { message: msg });
const text = (min, max, msg) => z.string().trim().min(min, msg).max(max, `Keep it under ${max} characters`);

export const newRequestSchema = z
  .object({
    requesterName: text(2, 120, 'Tell us who is requesting this analysis'),
    dept: oneOf(DEPARTMENTS, 'Choose your department'),
    site: oneOf(SITES, 'Choose the plant or site'),
    unit: text(1, 20, 'Choose the process unit'),
    point: text(1, 80, 'Enter the sampling point or tank number'),
    batch: z.string().trim().max(40).optional().default(''),
    costCenter: z.string().trim().toUpperCase().regex(/^CC-\d{4}$/, 'Cost center should look like CC-4100'),
    product: oneOf(PRODUCTS.map((p) => p.id), 'Choose the product or sample type'),
    numSamples: z.coerce.number().int().min(1).max(20),
    sampledAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'When was the sample taken?'),
    sampledBy: text(2, 120, 'Who drew the sample?'),
    volume: text(1, 20, 'How much sample is in each container?'),
    container: oneOf(CONTAINERS.map((c) => c.id), 'Choose the container type'),
    packageId: z.string().optional().nullable(),
    tests: z.array(z.string()).min(1, 'Pick a test package or at least one test').max(40),
    purpose: oneOf(PURPOSES, 'What is this analysis for?'),
    spec: text(1, 20, 'Choose a specification'),
    flamClass: oneOf(FLAM_CLASSES, 'Select the flammability class'),
    h2s: z.boolean(),
    h2sPpm: z.union([z.coerce.number(), z.literal('')]).optional(),
    pressurized: z.boolean(),
    norm: z.boolean(),
    storage: oneOf(STORAGE, 'Choose a storage condition'),
    retain: z.boolean(),
    instructions: z.string().trim().max(1000).optional().default(''),
    priority: oneOf(PRIORITIES, 'Choose a priority'),
    attachments: z.array(z.object({ name: z.string().max(200), size: z.number().nonnegative() })).max(8).optional().default([]),
  })
  .superRefine((v, ctx) => {
    if (Date.parse(v.sampledAt) > Date.now() + 5 * 60e3) ctx.addIssue({ path: ['sampledAt'], code: 'custom', message: "Sampling time can't be in the future" });
    if (v.product === 'lpg' && !['cylinder', 'fpc'].includes(v.container)) ctx.addIssue({ path: ['container'], code: 'custom', message: 'LPG samples must be in a pressure cylinder' });
    if (v.product === 'natgas' && !['cylinder', 'gasbag'].includes(v.container)) ctx.addIssue({ path: ['container'], code: 'custom', message: 'Natural gas must be in a pressure cylinder or gas bag' });
    if (!GAS_PRODUCTS.includes(v.product) && v.container === 'gasbag') ctx.addIssue({ path: ['container'], code: 'custom', message: 'Gas bags are only for gaseous samples' });
    if (v.h2s && !(Number(v.h2sPpm) > 0)) ctx.addIssue({ path: ['h2sPpm'], code: 'custom', message: 'H₂S ppm is required when H₂S is present' });
    if (GAS_PRODUCTS.includes(v.product) && !v.pressurized) ctx.addIssue({ path: ['pressurized'], code: 'custom', message: 'Gas samples must be declared as pressurized' });
    if (v.priority === 'Critical' && v.instructions.length < 8) ctx.addIssue({ path: ['instructions'], code: 'custom', message: 'Critical – Shipment Hold needs a note for the lab' });
  });

/** Parse or throw a 400 with the first friendly message (plus all field errors). */
export function parse(schema, data) {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  const first = r.error.issues[0];
  const err = bad(first?.message || 'Please check the form', 'VALIDATION');
  err.fields = Object.fromEntries(r.error.issues.map((i) => [i.path.join('.'), i.message]));
  throw err;
}
