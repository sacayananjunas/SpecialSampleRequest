// Enumerations come from shared/rules.js; process units are loaded from the database (/api/catalog).
export { SITES, DEPARTMENTS, PRODUCTS, GAS_PRODUCTS, CONTAINERS, PURPOSES, FLAM_CLASSES, STORAGE, PRIORITIES, PRIORITY_SLA } from '../../shared/rules.js';
import { PRODUCTS, CONTAINERS } from '../../shared/rules.js';

/** Filled by hydrateCatalog() from the database */
export const PROCESS_UNITS = [];

export const unitName = (id) => PROCESS_UNITS.find((u) => u.id === id)?.name ?? id;
export const productName = (id) => PRODUCTS.find((p) => p.id === id)?.name ?? id;
export const containerName = (id) => CONTAINERS.find((c) => c.id === id)?.name ?? id;
