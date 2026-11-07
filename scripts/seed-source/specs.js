// Specification limits per standard. Each entry: testId -> { min?, max?, nominal } where nominal is a typical on-spec value.
// Limits simplified from the published standards for demo purposes.

export const SPECS = {
  EN590: {
    name: 'EN 590 (Automotive diesel)',
    short: 'EN 590',
    limits: {
      density: { min: 820, max: 845, nominal: 835 },
      d86: { max: 360, nominal: 345 },
      sulfur: { max: 10, nominal: 6.5 },
      flash: { min: 55, nominal: 64 },
      visc: { min: 2.0, max: 4.5, nominal: 3.1 },
      kf: { max: 200, nominal: 85 },
      cetane: { min: 46, nominal: 51 },
      cfpp: { max: -5, nominal: -12 },
      cloud: { max: 0, nominal: -6 },
      copper: { max: 1, nominal: 1 },
      ash: { max: 0.01, nominal: 0.003 },
      mcr: { max: 0.3, nominal: 0.12 },
    },
  },
  D975: {
    name: 'ASTM D975 Grade No. 2-D S15',
    short: 'ASTM D975',
    limits: {
      sulfur: { max: 15, nominal: 8 },
      flash: { min: 52, nominal: 62 },
      visc: { min: 1.9, max: 4.1, nominal: 3.0 },
      d86: { min: 282, max: 338, nominal: 320 },
      cetane: { min: 40, nominal: 47 },
      cloud: { max: 2, nominal: -4 },
      ash: { max: 0.01, nominal: 0.003 },
      kf: { max: 500, nominal: 120 },
    },
  },
  D4814: {
    name: 'ASTM D4814 Gasoline (Class C)',
    short: 'ASTM D4814',
    limits: {
      density: { min: 720, max: 775, nominal: 745 },
      d86: { max: 225, nominal: 198 },
      rvp: { max: 69, nominal: 61 },
      ron: { min: 91, nominal: 92.6 },
      mon: { min: 81, nominal: 82.8 },
      sulfur: { max: 80, nominal: 22 },
      copper: { max: 1, nominal: 1 },
      piano: { max: 35, nominal: 28 },
    },
  },
  DEFSTAN: {
    name: 'DEF STAN 91-091 Jet A-1',
    short: 'DEF STAN 91-091',
    limits: {
      density: { min: 775, max: 840, nominal: 798 },
      d86: { max: 300, nominal: 262 },
      flash: { min: 38, nominal: 44 },
      freeze: { max: -47, nominal: -53 },
      sulfur: { max: 3000, nominal: 650 },
      tan: { max: 0.1, nominal: 0.006 },
      copper: { max: 1, nominal: 1 },
      kf: { max: 75, nominal: 35 },
      saybolt: { nominal: 24 },
      h2s: { max: 30, nominal: 4 },
    },
  },
  CRUDE: {
    name: 'Crude Receipt Spec (internal)',
    short: 'Crude internal',
    limits: {
      density: { min: 820, max: 900, nominal: 862 },
      sulfur_xrf: { max: 2.5, nominal: 1.4 },
      visc: { max: 60, nominal: 9.5 },
      pour: { max: 27, nominal: 6 },
      kf: { max: 5000, nominal: 1200 },
      tan: { max: 1.0, nominal: 0.35 },
      icp: { max: 150, nominal: 48 },
      mcr: { max: 8, nominal: 4.2 },
      simdis: { nominal: 520 },
      h2s: { max: 10, nominal: 2.1 },
    },
  },
  LPG: {
    name: 'LPG Commercial Propane-Butane (internal)',
    short: 'LPG internal',
    limits: {
      lpgcomp: { min: 30, max: 70, nominal: 52 },
      copper: { max: 1, nominal: 1 },
      h2s: { max: 1, nominal: 0.2 },
    },
  },
  INTERNAL: {
    name: 'Internal plant specification',
    short: 'Internal spec',
    limits: {
      density: { min: 940, max: 991, nominal: 968 },
      visc: { max: 380, nominal: 260 },
      sulfur_xrf: { max: 0.5, nominal: 0.42 },
      flash: { min: 60, nominal: 85 },
      pour: { max: 30, nominal: 9 },
      icp: { max: 200, nominal: 95 },
      ash: { max: 0.1, nominal: 0.03 },
      mcr: { max: 18, nominal: 11 },
      mfi: { min: 10, max: 14, nominal: 12 },
      btex: { max: 50, nominal: 12 },
      ngcomp: { min: 85, nominal: 91.5 },
      h2s: { max: 4, nominal: 1.5 },
    },
  },
};

export const SPEC_OPTIONS = [
  { id: 'D975', label: 'ASTM D975 (Diesel)' },
  { id: 'EN590', label: 'EN 590 (Diesel)' },
  { id: 'D4814', label: 'ASTM D4814 (Gasoline)' },
  { id: 'DEFSTAN', label: 'DEF STAN 91-091 (Jet A-1)' },
  { id: 'CRUDE', label: 'Crude receipt (internal)' },
  { id: 'LPG', label: 'LPG (internal)' },
  { id: 'INTERNAL', label: 'Internal plant spec' },
];

export const specLimit = (specId, testId) => SPECS[specId]?.limits?.[testId];
