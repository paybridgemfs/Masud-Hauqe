import {
  ensureDatabaseInitialized,
  getDbState,
  updateDbState,
  getPublicWebsiteData,
  logAuditEvent,
  createUniqueSlug,
  cuid,
} from './db.js';

export const prisma = {
  ensureDatabaseInitialized,
  getDbState,
  updateDbState,
  getPublicWebsiteData,
  logAuditEvent,
  createUniqueSlug,
  cuid,
};

export default prisma;
