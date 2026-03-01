const ROLES = {
  ADMIN: 'admin',
  SALES: 'sales',
  ACCOUNTS: 'accounts',
  VIEWER: 'viewer',
  MANAGER: 'manager',
  STAFF: 'staff',
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: ['*'],
  [ROLES.MANAGER]: ['*'],
  [ROLES.SALES]: [
    'clients:read', 'clients:write',
    'catalog:read', 'catalog:write',
    'documents:read', 'documents:write', 'documents:status', 'documents:convert', 'documents:approve',
    'reports:read',
    'notifications:read',
    'activities:read',
  ],
  [ROLES.STAFF]: [
    'clients:read', 'clients:write',
    'catalog:read', 'catalog:write',
    'documents:read', 'documents:write', 'documents:status',
    'reports:read',
    'activities:read',
  ],
  [ROLES.ACCOUNTS]: [
    'clients:read',
    'catalog:read',
    'documents:read', 'documents:status',
    'payments:read', 'payments:write',
    'creditnotes:read', 'creditnotes:write',
    'reports:read',
    'notifications:read', 'notifications:write',
    'activities:read',
  ],
  [ROLES.VIEWER]: [
    'clients:read',
    'catalog:read',
    'documents:read',
    'reports:read',
    'activities:read',
  ],
};

const VALID_ROLES = Object.values(ROLES);

function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes('*') || perms.includes(permission);
}

module.exports = {
  ROLES,
  VALID_ROLES,
  ROLE_PERMISSIONS,
  hasPermission,
};
