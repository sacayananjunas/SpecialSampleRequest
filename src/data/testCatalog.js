// Test catalog and packages: filled from the database by hydrateCatalog() (see ./catalog.js).
export const TEST_CATALOG = [];
export const PACKAGES = [];

export const testById = (id) => TEST_CATALOG.find((t) => t.id === id);
export const packageById = (id) => PACKAGES.find((p) => p.id === id);
