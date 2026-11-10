import { cookies, headers } from 'next/headers';
import { createSessionToken, verifySessionToken, verifyPassword, hashPassword } from './security.js';
import { getDbState, updateDbState, appendAuditRecord } from './db.js';
import { getEnvConfig } from './env.js';

export const SESSION_COOKIE_NAME = 'mh_admin_session';

async function isHttpsRequest() {
  try {
    const env = getEnvConfig();
    const headerList = await headers();
    const proto = headerList.get('x-forwarded-proto') || '';
    const host = headerList.get('x-forwarded-host') || headerList.get('host') || '';
    return proto.includes('https') || host.includes('.run.app') || env.isProduction;
  } catch {
    return false;
  }
}

export async function authenticateAdmin(username, password) {
  const db = await getDbState();
  const normalized = String(username || '').trim().toLowerCase();
  const admin = (db.admins || []).find(
    (a) => a.username.toLowerCase() === normalized && a.isActive
  );
  if (!admin) {
    return { ok: false, error: 'Invalid username or password.' };
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    return { ok: false, error: 'Invalid username or password.' };
  }

  const now = new Date().toISOString();
  await updateDbState((state) => {
    const target = state.admins.find((a) => a.id === admin.id);
    if (target) {
      target.lastLoginAt = now;
      target.updatedAt = now;
    }
    appendAuditRecord(state, {
      adminId: admin.id,
      action: 'ADMIN_LOGIN',
      entityType: 'Admin',
      entityId: admin.id,
      metadata: { username: admin.username },
    });
  });

  return {
    ok: true,
    admin: {
      id: admin.id,
      name: admin.name,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      mustChangePassword: admin.mustChangePassword,
    },
  };
}

export async function setAdminSessionCookie(admin, rememberMe = false) {
  const maxAge = rememberMe ? 60 * 60 * 24 * 14 : 60 * 60 * 24;
  const token = createSessionToken(
    {
      sub: admin.id,
      username: admin.username,
      role: admin.role,
      mustChangePassword: Boolean(admin.mustChangePassword),
    },
    maxAge
  );

  const https = await isHttpsRequest();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: https,
    sameSite: https ? 'none' : 'lax',
    ...(https ? { partitioned: true } : {}),
    path: '/',
    maxAge,
  });

  return token;
}

export async function clearAdminSessionCookie() {
  const https = await isHttpsRequest();
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: https,
    sameSite: https ? 'none' : 'lax',
    ...(https ? { partitioned: true } : {}),
    path: '/',
    maxAge: 0,
  });
}

export async function getCurrentAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    const payload = verifySessionToken(token);
    if (!payload || !payload.sub) return null;

    const db = await getDbState();
    const admin = (db.admins || []).find((a) => a.id === payload.sub && a.isActive);
    if (!admin) return null;

    return {
      id: admin.id,
      name: admin.name,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      mustChangePassword: Boolean(admin.mustChangePassword),
      lastLoginAt: admin.lastLoginAt,
    };
  } catch {
    return null;
  }
}

export async function requireAdminSession() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { authorized: false, admin: null };
  }
  return { authorized: true, admin };
}

export async function changeAdminPassword(adminId, currentPassword, newPassword) {
  const db = await getDbState();
  const admin = (db.admins || []).find((a) => a.id === adminId);
  if (!admin) {
    return { ok: false, error: 'Admin account not found.' };
  }

  const valid = await verifyPassword(currentPassword, admin.passwordHash);
  if (!valid) {
    return { ok: false, error: 'Current password is incorrect.' };
  }

  const newHash = await hashPassword(newPassword);
  let updatedAdmin = null;

  await updateDbState((state) => {
    const target = state.admins.find((a) => a.id === adminId);
    if (target) {
      target.passwordHash = newHash;
      target.mustChangePassword = false;
      target.updatedAt = new Date().toISOString();
      updatedAdmin = {
        id: target.id,
        name: target.name,
        username: target.username,
        email: target.email,
        role: target.role,
        mustChangePassword: false,
      };
    }
    appendAuditRecord(state, {
      adminId,
      action: 'ADMIN_PASSWORD_CHANGED',
      entityType: 'Admin',
      entityId: adminId,
      metadata: { mustChangePasswordCleared: true },
    });
  });

  if (updatedAdmin) {
    await setAdminSessionCookie(updatedAdmin, false);
  }

  return { ok: true, admin: updatedAdmin };
}
