// =====================================================
// DASHBOARD TYPES
// =====================================================

export interface AdminUser {
  id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  role?: string;
  department?: string;
  designation?: string;
  employeeId?: string;
  profilePhoto?: string | null;
}

export interface DashboardOverview {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  totalDepartments?: number;
  completionRate: number;
}

export interface TaskDistribution {
  PENDING: number;
  IN_PROGRESS: number;
  COMPLETED: number;
}

export interface TrendItem {
  value: string;
  percentage: number | null;
  isPositive: boolean;
  isDown: boolean;
}

export interface DashboardTrends {
  employees: TrendItem;
  tasks: TrendItem;
  completed: TrendItem;
  overdue: TrendItem;
  completionRate?: TrendItem;
}

export interface AdminDashboardData {
  user?: AdminUser;
  overview?: DashboardOverview;
  taskDistribution?: TaskDistribution;
  trends?: DashboardTrends;
}

export interface EmployeePerformanceItem {
  id?: string;
  _id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  employeeId?: string;
  role?: string;
  department?: string;
  designation?: string;
  profilePhoto?: string | null;
  isBlocked?: boolean;
  totalTasks: number;
  completedTasks: number;
  pendingTasks?: number;
  inProgressTasks?: number;
  overdueTasks?: number;
  completionRate: number;
}

export interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecentTaskItem {
  _id?: string;
  id?: string;
  title: string;
  description?: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | string;
  dueDate: string;
  assignedTo?:
    | {
        _id?: string;
        id?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        profilePhoto?: string | null;
      }
    | string
    | null;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

export interface WorkspaceHealthData {
  status: "UP" | "DOWN" | "DEGRADED";
  database?: string;
  timestamp?: string;
}
