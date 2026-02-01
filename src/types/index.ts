export type TaskType = "lead-approval" | "lead-alert" | "lead-outreach" | "error-alert" | "other";

export interface ErrorAlertDetails {
  error: string;
  url: string;
}

export interface OtherTaskDetails {
  description: string;
  notes?: string;
}

export interface LeadApprovalDetails {
  clientName?: string | null;
  clientId: string;
  whatsapp: string;
  website?: string | null;
  category: string;
  icp: string;
  requirement: string;
  contactInfo: string;
  proofLink: string;
  recordId?: string;
}

export interface LeadAlertDetails {
  clientName: string;
  category: string;
  whatsapp: string;
  clientStatus: string;
  alertLevel: "yellow" | "red";
  issue: string;
  timeSinceLastLead: string;
}

export interface LeadOutreachDetails {
  requirement: string;
  contactInfo: string;
  post: string;
  comment: string;
}

export interface Task {
  id: string;
  type: TaskType;
  title: string;
  status: "pending" | "done" | "approved" | "disapproved";
  createdAt: string;
  details: LeadApprovalDetails | LeadAlertDetails | LeadOutreachDetails | ErrorAlertDetails | OtherTaskDetails;
  disapprovalReason?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "contact";
  timestamp: string;
  status: "sent" | "delivered" | "read";
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
