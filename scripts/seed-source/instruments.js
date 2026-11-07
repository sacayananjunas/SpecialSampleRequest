export const INSTRUMENT_STATES = ['Online', 'In Use', 'Calibration Due', 'Down'];

export const INSTRUMENTS = [
  { id: 'gc1', name: 'GC', model: 'Agilent 8890 · RGA', status: 'In Use', detail: 'PIANO run · 38 min left' },
  { id: 'icp', name: 'ICP-OES', model: 'Thermo iCAP PRO', status: 'Online', detail: 'Last cal. 06 Nov 07:40' },
  { id: 'dist', name: 'Distillation', model: 'PAC OptiDist D86', status: 'In Use', detail: 'Diesel D86 · 22 min left' },
  { id: 'visc', name: 'Viscometer', model: 'Cannon CAV 4.2', status: 'Calibration Due', detail: 'Cert. standard due today' },
  { id: 'kf', name: 'Karl Fischer', model: 'Metrohm 917 Coulometer', status: 'Online', detail: 'Drift 4 µg/min' },
  { id: 'flash', name: 'Flash Point Tester', model: 'Anton Paar PMA 500', status: 'Down', detail: 'Igniter fault · service ticket #4471' },
];
