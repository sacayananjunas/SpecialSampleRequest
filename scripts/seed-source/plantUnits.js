// Plant sites, process units, sampling points and product types

export const SITES = ['Bataan Refinery', 'Batangas Terminal', 'Mindanao Polymer Complex'];

export const DEPARTMENTS = [
  'Process Engineering',
  'Operations',
  'Quality Assurance',
  'Trading & Supply',
  'Technical Services',
  'HSE',
  'R&D',
];

export const PROCESS_UNITS = [
  { id: 'CDU', name: 'CDU', full: 'Crude Distillation Unit', points: ['CDU-SP-101 Crude feed', 'CDU-SP-114 Naphtha draw', 'CDU-SP-121 Kero draw', 'CDU-SP-130 Diesel draw'] },
  { id: 'VDU', name: 'VDU', full: 'Vacuum Distillation Unit', points: ['VDU-SP-201 VGO', 'VDU-SP-214 Vacuum residue'] },
  { id: 'FCC', name: 'FCC', full: 'Fluid Catalytic Cracker', points: ['FCC-SP-301 Feed', 'FCC-SP-318 Gasoline', 'FCC-SP-322 LCO', 'FCC-SP-340 E-cat'] },
  { id: 'HDT', name: 'Hydrotreater', full: 'Diesel Hydrotreater', points: ['HDT-SP-401 Feed', 'HDT-SP-415 Product', 'HDT-SP-422 Sour water'] },
  { id: 'REF', name: 'Reformer', full: 'Catalytic Reformer', points: ['REF-SP-501 Feed', 'REF-SP-512 Reformate', 'REF-SP-520 Net gas'] },
  { id: 'POLY', name: 'Polymer Plant', full: 'Polymer Plant (PE/PP)', points: ['PP-SP-610 PP pellets', 'PE-SP-620 HDPE pellets'] },
  { id: 'TANK', name: 'Tank Farm', full: 'Tank Farm', points: ['TK-101', 'TK-102', 'TK-205', 'TK-206', 'TK-310', 'TK-415', 'SPH-01 (LPG sphere)'] },
  { id: 'JETTY', name: 'Jetty', full: 'Marine Jetty', points: ['JT-01 Loading arm A', 'JT-02 Loading arm B', 'JT-03 Ship manifold'] },
];

export const unitName = (id) => PROCESS_UNITS.find((u) => u.id === id)?.name ?? id;

export const PRODUCTS = [
  { id: 'crude', name: 'Crude Oil', hazard: ['flame', 'health', 'env'], flam: 'Cat 1' },
  { id: 'naphtha', name: 'Naphtha', hazard: ['flame', 'health', 'env'], flam: 'Cat 1' },
  { id: 'gasoline', name: 'Gasoline', hazard: ['flame', 'health', 'env'], flam: 'Cat 1' },
  { id: 'jet', name: 'Kerosene / Jet Fuel', hazard: ['flame', 'exclaim', 'env'], flam: 'Cat 3' },
  { id: 'diesel', name: 'Diesel', hazard: ['flame', 'health', 'env'], flam: 'Cat 3' },
  { id: 'fueloil', name: 'Fuel Oil', hazard: ['health', 'env'], flam: 'Cat 4' },
  { id: 'lube', name: 'Lube Base Oil', hazard: [], flam: 'Not classified' },
  { id: 'lpg', name: 'LPG', hazard: ['flame', 'gas'], flam: 'Cat 1 (gas)' },
  { id: 'natgas', name: 'Natural Gas', hazard: ['flame', 'gas'], flam: 'Cat 1 (gas)' },
  { id: 'polymer', name: 'Polymer (PE/PP)', hazard: [], flam: 'Not classified' },
  { id: 'catalyst', name: 'Catalyst', hazard: ['health', 'exclaim'], flam: 'Not classified' },
  { id: 'water', name: 'Process / Waste Water', hazard: ['exclaim'], flam: 'Not classified' },
  { id: 'other', name: 'Other', hazard: ['exclaim'], flam: 'Unknown' },
];

export const productName = (id) => PRODUCTS.find((p) => p.id === id)?.name ?? id;

export const GAS_PRODUCTS = ['lpg', 'natgas'];

export const CONTAINERS = [
  { id: 'glass', name: 'Glass bottle' },
  { id: 'can', name: 'Epoxy-lined can' },
  { id: 'cylinder', name: 'Pressure cylinder' },
  { id: 'fpc', name: 'Floating-piston cylinder' },
  { id: 'gasbag', name: 'Gas bag' },
];

export const containerName = (id) => CONTAINERS.find((c) => c.id === id)?.name ?? id;

export const PURPOSES = [
  'Process Control',
  'Product Release',
  'Shipment / Custody Transfer',
  'Troubleshooting',
  'Customer Complaint',
  'R&D',
];

export const FLAM_CLASSES = ['Cat 1 – Extremely flammable', 'Cat 2 – Highly flammable', 'Cat 3 – Flammable', 'Cat 4 – Combustible', 'Not classified'];

export const STORAGE = ['Ambient', 'Cool <4°C', 'Keep Dark'];

export const PRIORITIES = ['Routine', 'Urgent', 'Critical'];

// Turnaround SLA in hours per priority
export const PRIORITY_SLA = { Routine: 72, Urgent: 24, Critical: 8 };
