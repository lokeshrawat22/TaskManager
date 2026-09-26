export interface DashboardOverview {
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface TaskDistribution {
  TODO: number;
  IN_PROGRESS: number;
  COMPLETED: number;
}

export interface EmployeeDashboardData {
  user?: any;
  overview: DashboardOverview;
  taskDistribution: TaskDistribution;
  todaysTasks: any[];
  upcomingTasks: any[];
}