export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee: string;
  dueDate: string;
  createdAt: string;
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
  openTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  totalTasks: number;
  overdueTasks: number;
}
