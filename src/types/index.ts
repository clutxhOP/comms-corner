export type TaskType = 'lead-approval' | 'lead-alert' | 'lead-outreach' | 'other';

export interface OtherTaskDetails {
  description: string;
  notes?: string;
}

export interface LeadApprovalDetails {
  clientId: string;
  category: string;
  icp: string;
  requirement: string;
  contactInfo: string;
  proofLink: string;
}

export interface LeadAlertDetails {
  clientName: string;
  category: string;
  clientStatus: string;
  alertLevel: 'yellow' | 'red';
  issue: string;
  lastLeadSent: string;
  timeSinceLastLead: string;
  assignee: string;
  whatsapp: string;
}

export interface LeadOutreachDetails {
  requirement: string;
  contactInfo: string;
  proofLink: string;
}

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  status: 'pending' | 'done';
  createdAt: string;
  details: LeadApprovalDetails | LeadAlertDetails | LeadOutreachDetails | OtherTaskDetails;
  disapprovalReason?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'contact';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface ChatContact {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  online: boolean;
}

export interface DashboardStats {
  pendingApprovals: number;
  leadAlerts: number;
  pendingOutreach: number;
  completedToday: number;
  totalPending: number;
}
