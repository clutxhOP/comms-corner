import { TaskType } from '@/types';

export type UserRole = 'admin' | 'dev' | 'ops';

// Define which task types each role can see
const ROLE_ALLOWED_TASK_TYPES: Record<UserRole, TaskType[]> = {
  admin: ['lead-approval', 'lead-alert', 'lead-outreach', 'error-alert', 'other'],
  dev: ['lead-alert', 'error-alert', 'other'], // Excludes lead-approval, lead-outreach
  ops: ['lead-approval', 'lead-alert', 'lead-outreach', 'other'], // Excludes error-alert
};

// Define which tabs each role can see
export const ROLE_VISIBLE_TABS: Record<UserRole, string[]> = {
  admin: ['all', 'mentioned', 'approvals', 'alerts', 'outreach', 'errors', 'other'],
  dev: ['all', 'mentioned', 'alerts', 'errors', 'other'], // No approvals, outreach
  ops: ['all', 'mentioned', 'approvals', 'alerts', 'outreach', 'other'], // No errors
};

/**
 * Get the allowed task types for a user based on their roles
 * If user has admin role, they see everything
 * Otherwise, merge allowed types from all their roles
 */
export function getAllowedTaskTypes(roles: UserRole[]): TaskType[] {
  // Admin sees everything
  if (roles.includes('admin')) {
    return ROLE_ALLOWED_TASK_TYPES.admin;
  }

  // Merge allowed types from all roles (deduplicated)
  const allowedTypes = new Set<TaskType>();
  
  for (const role of roles) {
    const typesForRole = ROLE_ALLOWED_TASK_TYPES[role] || [];
    typesForRole.forEach(type => allowedTypes.add(type));
  }

  // If no roles, default to empty (shouldn't happen in practice)
  if (allowedTypes.size === 0) {
    return ROLE_ALLOWED_TASK_TYPES.admin; // Fallback to show all
  }

  return Array.from(allowedTypes);
}

/**
 * Get the visible tabs for a user based on their roles
 */
export function getVisibleTabs(roles: UserRole[]): string[] {
  // Admin sees everything
  if (roles.includes('admin')) {
    return ROLE_VISIBLE_TABS.admin;
  }

  // For multiple roles, find the most permissive set
  // (in practice, most users have one non-admin role)
  const allTabs = new Set<string>();
  
  for (const role of roles) {
    const tabsForRole = ROLE_VISIBLE_TABS[role] || [];
    tabsForRole.forEach(tab => allTabs.add(tab));
  }

  // If no roles, default to admin tabs (shouldn't happen)
  if (allTabs.size === 0) {
    return ROLE_VISIBLE_TABS.admin;
  }

  // Return in the correct order
  const orderedTabs = ['all', 'mentioned', 'approvals', 'alerts', 'outreach', 'errors', 'other'];
  return orderedTabs.filter(tab => allTabs.has(tab));
}

/**
 * Check if a specific tab should be visible for the user's roles
 */
export function isTabVisible(tabId: string, roles: UserRole[]): boolean {
  const visibleTabs = getVisibleTabs(roles);
  return visibleTabs.includes(tabId);
}
