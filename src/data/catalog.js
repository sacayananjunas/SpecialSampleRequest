// Fills the reference-data stores in place so every existing import keeps working.
import { TEST_CATALOG, PACKAGES } from './testCatalog';
import { SPECS, SPEC_OPTIONS } from './specs';
import { PROCESS_UNITS } from './plantUnits';

const refill = (arr, items) => arr.splice(0, arr.length, ...items);

export function hydrateCatalog({ units, tests, specs, packages }) {
  refill(PROCESS_UNITS, units);
  refill(TEST_CATALOG, tests);
  refill(PACKAGES, packages);
  Object.keys(SPECS).forEach((k) => delete SPECS[k]);
  specs.forEach((s) => (SPECS[s.id] = { name: s.name, short: s.short, limits: s.limits }));
  refill(SPEC_OPTIONS, specs.map((s) => ({ id: s.id, label: s.label })));
}
