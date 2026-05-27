export interface Comment {
  user: {
    _id: string;
    username: string;
    role: string;
  };
  text: string;
  createdAt: Date;
}

export interface History {
  action: string;
  user: {
    _id: string;
    username: string;
  };
  details: string;
  timestamp: Date;
}

export interface Task {
  _id?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'Pending' | 'In Progress' | 'Sent Back' | 'Reverted' | 'Waiting for Approval' | 'Approved' | 'Done' | 'Scheduled';
  createdBy: {
    _id: string;
    username: string;
    email: string;
    role: string;
  };
  assignedTo?: {
    _id: string;
    username: string;
    email: string;
    role: string;
  };
  dueAt?: Date | string;
  reminderAt?: Date | string;
  isReassignedToAdmin?: boolean;
  reminderFired?: boolean;
  comments?: Comment[];
  history?: History[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: string;
  assignedTo?: string;
  dueAt?: Date | string;
  reminderAt?: Date | string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: string;
  assignedTo?: string;
  dueAt?: Date | string;
  reminderAt?: Date | string;
  comment?: string;
}