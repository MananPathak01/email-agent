import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Plus, 
  MoreHorizontal, 
  Check, 
  Clock, 
  Lightbulb,
  Calendar,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TaskPanelProps {
  userId: number;
}

export default function TaskPanel({ userId }: TaskPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/tasks'],
    queryFn: async () => {
      const response = await fetch(`/api/tasks?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    }
  });

  // Fetch analytics
  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/dashboard'],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/dashboard?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: number; status: string }) => {
      const response = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Failed to update task');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/dashboard'] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task",
        variant: "destructive",
      });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-error bg-opacity-10 text-error';
      case 'medium':
        return 'bg-warning bg-opacity-10 text-warning';
      case 'low':
        return 'bg-primary bg-opacity-10 text-primary';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success bg-opacity-10 text-success';
      case 'in_progress':
        return 'bg-warning bg-opacity-10 text-warning';
      case 'pending':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const formatDueDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = taskDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0) return `In ${diffDays} days`;
    return `${Math.abs(diffDays)} days overdue`;
  };

  const getTaskProgress = (task: any) => {
    if (task.status === 'completed') return 100;
    if (task.status === 'in_progress') return 60;
    return 0;
  };

  const pendingTasks = tasks.filter((task: any) => task.status === 'pending' || task.status === 'in_progress');
  const completedTasks = tasks.filter((task: any) => task.status === 'completed');

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 flex flex-col">
      {/* Task Panel Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Active Tasks</h3>
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Task
          </Button>
        </div>
        <div className="flex items-center space-x-4 mt-3 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-warning rounded-full"></div>
            <span className="text-gray-600">{pendingTasks.length} Pending</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-gray-600">{completedTasks.length} Complete</span>
          </div>
        </div>
      </div>

      {/* Task List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {tasks.map((task: any) => (
            <div 
              key={task.id} 
              className={`task-card bg-white rounded-lg border p-4 shadow-sm ${getPriorityColor(task.priority)}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs font-medium ${getPriorityBadgeColor(task.priority)}`}
                  >
                    {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                  </Badge>
                  {task.status === 'completed' && (
                    <Badge 
                      variant="secondary" 
                      className={`inline-flex items-center text-xs font-medium ${getStatusColor(task.status)}`}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
              
              <h4 className="font-medium text-gray-900 mb-2">{task.title}</h4>
              {task.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
              )}
              
              {/* Progress Steps or Progress Bar */}
              {task.metadata?.steps && task.status !== 'completed' ? (
                <div className="space-y-2 mb-3">
                  {task.metadata.steps.slice(0, 3).map((step: string, index: number) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        index === 0 ? 'bg-success' : 
                        index === 1 ? 'bg-primary' : 
                        'border-2 border-gray-300'
                      }`}>
                        {index === 0 ? (
                          <Check className="text-white h-2.5 w-2.5" />
                        ) : index === 1 ? (
                          <Clock className="text-white h-2.5 w-2.5" />
                        ) : null}
                      </div>
                      <span className={`text-sm ${
                        index === 0 ? 'text-gray-600' : 
                        index === 1 ? 'text-gray-900 font-medium' : 
                        'text-gray-400'
                      }`}>
                        {step}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="text-gray-900 font-medium">{getTaskProgress(task)}%</span>
                  </div>
                  <Progress value={getTaskProgress(task)} className="h-2" />
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-1 text-gray-500">
                  <Calendar className="h-3 w-3" />
                  <span>Due: {formatDueDate(task.dueDate)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {task.assignedTo ? 'LM' : 'You'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-gray-600">{task.assignedTo ? 'Lisa' : 'You'}</span>
                </div>
              </div>

              {/* Task Action Buttons */}
              {task.status !== 'completed' && (
                <div className="flex space-x-2 mt-3">
                  {task.status === 'pending' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: 'in_progress' })}
                      disabled={updateTaskMutation.isPending}
                    >
                      Start Task
                    </Button>
                  )}
                  {task.status === 'in_progress' && (
                    <Button 
                      size="sm"
                      onClick={() => updateTaskMutation.mutate({ taskId: task.id, status: 'completed' })}
                      disabled={updateTaskMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Complete
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* AI Suggestions */}
          <div className="gradient-primary rounded-lg p-4 text-white">
            <div className="flex items-center space-x-2 mb-2">
              <Lightbulb className="h-4 w-4" />
              <h4 className="font-medium">AI Suggestion</h4>
            </div>
            <p className="text-sm opacity-90 mb-3">
              I noticed multiple equipment requests this week. Would you like me to create a standardized template for faster processing?
            </p>
            <Button 
              size="sm"
              variant="secondary"
              className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-0"
            >
              Create Template
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Quick Stats */}
      <div className="bg-white border-t border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-3">Today's Activity</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {analytics?.emailsProcessedToday || 0}
            </div>
            <div className="text-xs text-gray-500">Emails Processed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">
              {analytics?.tasksCompletedToday || 0}
            </div>
            <div className="text-xs text-gray-500">Tasks Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">
              {pendingTasks.length}
            </div>
            <div className="text-xs text-gray-500">Pending Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary">
              {analytics?.aiAccuracy || 95}%
            </div>
            <div className="text-xs text-gray-500">AI Accuracy</div>
          </div>
        </div>
      </div>
    </div>
  );
}
