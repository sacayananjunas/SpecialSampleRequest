export const ROLES = {
  requester: {
    id: 'requester',
    label: 'Requester',
    blurb: 'Process engineer · operations · QA · trader',
    user: { name: 'Maya Santos', title: 'Process Engineer', dept: 'Process Engineering', site: 'Bataan Refinery', initials: 'MS' },
  },
  analyst: {
    id: 'analyst',
    label: 'Lab Analyst',
    blurb: 'Receives samples, runs tests, enters results',
    user: { name: 'Daniel Reyes', title: 'Senior Lab Analyst', dept: 'Central Laboratory', site: 'Bataan Refinery', initials: 'DR' },
  },
  supervisor: {
    id: 'supervisor',
    label: 'Lab Supervisor',
    blurb: 'Reviews QC, certifies results, watches SLAs',
    user: { name: 'Dr. Aisha Rahman', title: 'Laboratory Supervisor', dept: 'Central Laboratory', site: 'Bataan Refinery', initials: 'AR' },
  },
};

export const REQUESTERS = [
  { name: 'Maya Santos', dept: 'Process Engineering' },
  { name: 'Carlos Mendoza', dept: 'Operations' },
  { name: 'Priya Nair', dept: 'Quality Assurance' },
  { name: "Liam O'Connor", dept: 'Trading & Supply' },
  { name: 'Rosa Villanueva', dept: 'Technical Services' },
  { name: 'Kenji Watanabe', dept: 'R&D' },
];

export const ANALYSTS = ['Daniel Reyes', 'Ana Cruz', 'Mark Tan'];
export const SUPERVISOR = 'Dr. Aisha Rahman';
export const SAMPLERS = ['J. Dela Cruz (Field Operator)', 'R. Bautista (Shift Operator)', 'SGS Inspector', 'Intertek Inspector', 'M. Lim (Lab Sampler)'];
