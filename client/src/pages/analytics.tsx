import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import Sidebar from "@/components/sidebar";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Mail,
  CheckSquare,
  Users,
  Calendar,
  Activity
} from "lucide-react";

// Mock user ID for demo - in real app this would come from authentication
const CURRENT_USER_ID = 1;

export default function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/analytics/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/dashboard?userId=1');
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    }
  });

  const { data: emails = [] } = useQuery({
    queryKey: ['/api/emails'],
    queryFn: async () => {
      const response = await fetch('/api/emails?userId=1');
      if (!response.ok) throw new Error('Failed to fetch emails');
      return response.json();
    }
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['/api/tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks?userId=1');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      return response.json();
    }
  });

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  // Calculate additional metrics
  const completionRate = tasks.length > 0 ? (tasks.filter((t: any) => t.status === 'completed').length / tasks.length) * 100 : 0;
  const responseRate = emails.length > 0 ? (emails.filter((e: any) => e.status === 'processed').length / emails.length) * 100 : 0;
  
  // Email categories distribution
  const categoryData = emails.reduce((acc: any, email: any) => {
    if (email.category) {
      acc[email.category] = (acc[email.category] || 0) + 1;
    }
    return acc;
  }, {});

  // Priority distribution
  const priorityData = emails.reduce((acc: any, email: any) => {
    acc[email.priority] = (acc[email.priority] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar userId={CURRENT_USER_ID} />
      
      {/* Main Content */}
      <div className="flex-1 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your onboarding workflow performance</p>
          </div>
          <div className="flex items-center space-x-3">
            <Badge variant="outline" className="text-sm">
              Last 30 days
            </Badge>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Emails</p>
                  <p className="text-3xl font-bold">{analytics.totalEmails}</p>
                  <p className="text-blue-100 text-sm mt-1">
                    {analytics.onboardingEmails} onboarding
                  </p>
                </div>
                <Mail className="h-12 w-12 text-blue-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Tasks Created</p>
                  <p className="text-3xl font-bold">{tasks.length}</p>
                  <p className="text-green-100 text-sm mt-1">
                    {tasks.filter((t: any) => t.status === 'completed').length} completed
                  </p>
                </div>
                <CheckSquare className="h-12 w-12 text-green-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Response Time</p>
                  <p className="text-3xl font-bold">{analytics.averageResponseTime}h</p>
                  <p className="text-orange-100 text-sm mt-1">average</p>
                </div>
                <Clock className="h-12 w-12 text-orange-200" />
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Processed Today</p>
                  <p className="text-3xl font-bold">{analytics.processedToday}</p>
                  <p className="text-purple-100 text-sm mt-1">emails</p>
                </div>
                <Activity className="h-12 w-12 text-purple-200" />
              </div>
            </div>
          </div>

          {/* Progress Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Rates</h3>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Task Completion</span>
                    <span className="text-sm font-bold text-gray-900">{completionRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={completionRate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Email Response Rate</span>
                    <span className="text-sm font-bold text-gray-900">{responseRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={responseRate} className="h-2" />
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Onboarding Coverage</span>
                    <span className="text-sm font-bold text-gray-900">
                      {analytics.totalEmails > 0 ? ((analytics.onboardingEmails / analytics.totalEmails) * 100).toFixed(1) : 0}%
                    </span>
                  </div>
                  <Progress value={analytics.totalEmails > 0 ? (analytics.onboardingEmails / analytics.totalEmails) * 100 : 0} className="h-2" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckSquare className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Task Completed</p>
                    <p className="text-xs text-gray-500">Setup Equipment for John Anderson</p>
                  </div>
                  <span className="text-xs text-gray-500">2h ago</span>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Email Processed</p>
                    <p className="text-xs text-gray-500">Orientation Schedule Email</p>
                  </div>
                  <span className="text-xs text-gray-500">4h ago</span>
                </div>
                
                <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Response Generated</p>
                    <p className="text-xs text-gray-500">Paperwork Requirements Response</p>
                  </div>
                  <span className="text-xs text-gray-500">6h ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Category & Priority Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Categories</h3>
              
              <div className="space-y-3">
                {Object.entries(categoryData).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-700 capitalize">{category}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-gray-900">{count as number}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${((count as number) / emails.length) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Distribution</h3>
              
              <div className="space-y-3">
                {Object.entries(priorityData).map(([priority, count]) => {
                  const colors = {
                    high: 'bg-red-500',
                    medium: 'bg-yellow-500',
                    low: 'bg-green-500'
                  };
                  
                  return (
                    <div key={priority} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${colors[priority as keyof typeof colors] || 'bg-gray-500'}`}></div>
                        <span className="text-sm font-medium text-gray-700 capitalize">{priority} Priority</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-gray-900">{count as number}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${colors[priority as keyof typeof colors] || 'bg-gray-500'}`}
                            style={{ width: `${((count as number) / emails.length) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      </div>
    </div>
  );
}