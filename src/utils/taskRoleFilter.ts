import { TaskType } from '@/types';

export type UserRole = 'admin' | 'dev' | 'ops';

// Define which task types each role can see
const ROLE_ALLOWED_TASK_TYPES: Record<UserRole, TaskType[]> = {
  admin: ['lead-approval', 'lead-alert', 'lead-outreach', 'error-alert', 'awaiting-business', 'other'],
  dev: ['lead-alert', 'error-alert', 'other'], // Excludes lead-approval, lead-outreach, awaiting-business
  ops: ['lead-approval', 'lead-alert', 'lead-outreach', 'awaiting-business', 'other'], // Excludes error-alert
};

// Define which tabs each role can see
export const ROLE_VISIBLE_TABS: Record<UserRole, string[]> = {
  admin: ['all', 'mentioned', 'approvals', 'alerts', 'outreach', 'errors', 'awaiting-business', 'other'],
  dev: ['all', 'mentioned', 'alerts', 'errors', 'other'], // No approvals, outreach, awaiting-business
  ops: ['all', 'mentioned', 'approvals', 'alerts', 'outreach', 'awaiting-business', 'other'], // No errors
};

// Define which status filter options each role can see
// Approved/Disapproved only make sense for roles that can see lead-approval tasks
export const ROLE_STATUS_FILTERS: Record<UserRole, string[]> = {
  admin: ['all', 'pending', 'done', 'approved', 'disapproved'],
  dev: ['all', 'pending', 'done'], // No approved/disapproved since they can't see approval tasks
  ops: ['all', 'pending', 'done', 'approved', 'disapproved'],
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
  const orderedTabs = ['all', 'mentioned', 'approvals', 'alerts', 'outreach', 'errors', 'awaiting-business', 'other'];
  return orderedTabs.filter(tab => allTabs.has(tab));
}

/**
 * Check if a specific tab should be visible for the user's roles
 */
export function isTabVisible(tabId: string, roles: UserRole[]): boolean {
  const visibleTabs = getVisibleTabs(roles);
  return visibleTabs.includes(tabId);
}

/**
 * Get allowed status filter options based on user roles
 */
export function getAllowedStatusFilters(roles: UserRole[]): string[] {
  // Admin sees all statuses
  if (roles.includes('admin')) {
    return ROLE_STATUS_FILTERS.admin;
  }

  // If user has ops role, they can see approved/disapproved
  if (roles.includes('ops')) {
    return ROLE_STATUS_FILTERS.ops;
  }

  // Dev only sees basic statuses
  if (roles.includes('dev')) {
    return ROLE_STATUS_FILTERS.dev;
  }

  // Fallback
  return ROLE_STATUS_FILTERS.admin;
}

/**
 * Check if an "Other" task should be visible to a user based on assignment
 * @param assignedTo - Array of user IDs the task is assigned to
 * @param userId - Current user's ID
 * @param isAdmin - Whether the user is an admin
 * @returns Whether the task should be visible
 */
export function isOtherTaskVisibleToUser(
  assignedTo: string[] | null,
  userId: string,
  isAdmin: boolean
): boolean {
  // Admins see all tasks
  if (isAdmin) {
    return true;
  }

  // If task is unassigned (null), only admins can see it
  if (!assignedTo || assignedTo.length === 0) {
    return false;
  }

  // Check if user is directly assigned
  return assignedTo.includes(userId);
}

/**
 * Filter tasks based on role and assignment
 * This applies both task type filtering and assignment-based filtering for "Other" tasks
 */
export function filterTasksForUser<T extends { 
  type: string; 
  assigned_to: string[] | null;
  sent_to_ops?: boolean | null;
}>(
  tasks: T[],
  roles: UserRole[],
  userId: string
): T[] {
  const isAdmin = roles.includes('admin');
  const isDev = roles.includes('dev');
  const isOps = roles.includes('ops');
  const allowedTypes = getAllowedTaskTypes(roles);

  return tasks.filter(task => {
    // First check if the task type is allowed for this role
    if (!allowedTypes.includes(task.type as TaskType)) {
      return false;
    }

    // For "Other" tasks, apply assignment-based filtering
    if (task.type === 'other') {
      return isOtherTaskVisibleToUser(task.assigned_to, userId, isAdmin);
    }

    // For lead-alert tasks, apply dev/ops filtering based on sent_to_ops flag
    if (task.type === 'lead-alert') {
      // Admins see everything
      if (isAdmin) {
        return true;
      }
      
      // Dev users should NOT see alerts that have been escalated to OPS
      if (isDev && !isOps) {
        return task.sent_to_ops !== true;
      }
      
      // OPS users see alerts that have been escalated to them
      // They can also see non-escalated alerts (normal pending alerts)
      if (isOps && !isDev) {
        return true; // OPS sees all lead-alerts (both escalated and non-escalated pending)
      }
    }

    // All other task types pass through if type is allowed
    return true;
  });
}
