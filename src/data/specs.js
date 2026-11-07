// Specifications and their limits: filled from the database by hydrateCatalog() (see ./catalog.js).
export const SPECS = {};
export const SPEC_OPTIONS = [];

export const specLimit = (specId, testId) => SPECS[specId]?.limits?.[testId];
