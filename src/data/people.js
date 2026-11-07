// Role labels for the UI. Who the user is comes from the database (/api/auth/me).
export const ROLES = {
  requester: { id: 'requester', label: 'Requester', blurb: 'Process engineer · operations · QA · trader' },
  analyst: { id: 'analyst', label: 'Lab Analyst', blurb: 'Receives samples, runs tests, enters results' },
  supervisor: { id: 'supervisor', label: 'Lab Supervisor', blurb: 'Reviews QC, certifies results, watches SLAs' },
};
