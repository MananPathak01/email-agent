import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Sidebar from "@/components/sidebar";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Mail,
  CheckSquare,
  Users,
  Calendar,
  Activity,
  Zap,
  Target,
  Download,
  Filter,
  ArrowUp,
  ArrowDown,
  Minus
} from "lucide-react";
import { useAnalytics, useConnectedAccounts, useWorkflowTemplates } from "@/hooks/useMockApi";

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'quarter'>('week');
  const { analytics, loading } = useAnalytics(timeframe);
  const { accounts } = useConnectedAccounts();
  const { workflows } = useWorkflowTemplates();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No analytics data available</div>
      </div>
    );
  }

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (current: number, previous: number) => {
    if (current > previous) return 'text-green-600';
    if (current < previous) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-6 w-6" />
                Analytics Dashboard
              </h1>
              <p className="text-gray-600 mt-1">Monitor your AI email workforce performance and insights</p>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="quarter">This Quarter</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            {/* Key Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Emails</p>
                      <p className="text-3xl font-bold text-gray-900">{analytics.emailMetrics.totalEmails}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {getTrendIcon(analytics.emailMetrics.totalEmails, 35)}
                        <span className={`text-xs ${getTrendColor(analytics.emailMetrics.totalEmails, 35)}`}>
                          vs last {timeframe}
                        </span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Mail className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">AI Drafts Generated</p>
                      <p className="text-3xl font-bold text-gray-900">{analytics.aiPerformance.draftsGenerated}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {getTrendIcon(analytics.aiPerformance.draftsGenerated, 5)}
                        <span className={`text-xs ${getTrendColor(analytics.aiPerformance.draftsGenerated, 5)}`}>
                          vs last {timeframe}
                        </span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Zap className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Time Saved</p>
                      <p className="text-3xl font-bold text-gray-900">{analytics.aiPerformance.timeSaved}h</p>
                      <div className="flex items-center gap-1 mt-1">
                        {getTrendIcon(analytics.aiPerformance.timeSaved, 1.8)}
                        <span className={`text-xs ${getTrendColor(analytics.aiPerformance.timeSaved, 1.8)}`}>
                          vs last {timeframe}
                        </span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">AI Accuracy</p>
                      <p className="text-3xl font-bold text-gray-900">{Math.round(analytics.aiPerformance.averageConfidence * 100)}%</p>
                      <div className="flex items-center gap-1 mt-1">
                        {getTrendIcon(analytics.aiPerformance.averageConfidence * 100, 78)}
                        <span className={`text-xs ${getTrendColor(analytics.aiPerformance.averageConfidence * 100, 78)}`}>
                          vs last {timeframe}
                        </span>
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Target className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Performance Trends */}
            <Card>
              <CardHeader>
                <CardTitle>AI Performance Trends</CardTitle>
                <CardDescription>Track your AI accuracy and improvement over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Draft Acceptance Rate</span>
                      <span className="text-sm font-bold text-gray-900">
                        {Math.round((analytics.aiPerformance.draftsAccepted / analytics.aiPerformance.draftsGenerated) * 100)}%
                      </span>
                    </div>
                    <Progress value={(analytics.aiPerformance.draftsAccepted / analytics.aiPerformance.draftsGenerated) * 100} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">User Satisfaction</span>
                      <span className="text-sm font-bold text-gray-900">{analytics.aiPerformance.userSatisfactionRating}/5</span>
                    </div>
                    <Progress value={(analytics.aiPerformance.userSatisfactionRating / 5) * 100} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Learning Improvement</span>
                      <span className="text-sm font-bold text-gray-900">+{Math.round(analytics.aiPerformance.improvementRate * 100)}%</span>
                    </div>
                    <Progress value={analytics.aiPerformance.improvementRate * 100} className="h-3" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Categories and Workflow Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Email Categories</CardTitle>
                  <CardDescription>Distribution of email types processed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.emailMetrics.emailsByCategory.map((category) => (
                      <div key={category.category} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${
                            category.category === 'onboarding' ? 'bg-blue-500' :
                            category.category === 'support' ? 'bg-green-500' :
                            category.category === 'sales' ? 'bg-purple-500' :
                            category.category === 'meeting' ? 'bg-orange-500' :
                            'bg-gray-500'
                          }`} />
                          <span className="text-sm font-medium text-gray-700 capitalize">{category.category}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-900">{category.count}</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                category.category === 'onboarding' ? 'bg-blue-500' :
                                category.category === 'support' ? 'bg-green-500' :
                                category.category === 'sales' ? 'bg-purple-500' :
                                category.category === 'meeting' ? 'bg-orange-500' :
                                'bg-gray-500'
                              }`}
                              style={{ width: `${(category.count / analytics.emailMetrics.totalEmails) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workflow Performance</CardTitle>
                  <CardDescription>Success rates of your AI workflows</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.workflowMetrics.workflowSuccessRates.map((workflow) => (
                      <div key={workflow.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{workflow.name}</span>
                          <span className="text-sm font-bold text-gray-900">{Math.round(workflow.rate * 100)}%</span>
                        </div>
                        <Progress value={workflow.rate * 100} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Connected Accounts Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Connected Accounts Performance</CardTitle>
                <CardDescription>AI performance across your connected email accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accounts.map((account) => (
                    <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">
                          {account.provider === 'gmail' ? '📧' : '📮'}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{account.displayName}</h4>
                          <p className="text-sm text-gray-600">{account.email}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-6 text-center">
                        <div>
                          <div className="text-lg font-semibold text-gray-900">{account.processingStats.draftsGenerated}</div>
                          <div className="text-xs text-gray-500">Drafts</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-green-600">{account.processingStats.draftsAccepted}</div>
                          <div className="text-xs text-gray-500">Accepted</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-blue-600">
                            {Math.round(account.processingStats.averageConfidence * 100)}%
                          </div>
                          <div className="text-xs text-gray-500">Accuracy</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Email Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Email Volume</CardTitle>
                <CardDescription>Email processing volume over the selected timeframe</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.emailMetrics.dailyVolume.map((day) => (
                    <div key={day.date} className="flex items-center gap-4">
                      <div className="w-20 text-sm text-gray-600">
                        {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{day.count} emails</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full" 
                            style={{ width: `${(day.count / Math.max(...analytics.emailMetrics.dailyVolume.map(d => d.count))) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* User Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>User Engagement</CardTitle>
                <CardDescription>How you're using the AI email workforce features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{analytics.userEngagement.sessionDuration}m</div>
                    <div className="text-sm text-gray-600">Avg Session</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{analytics.userEngagement.feedbackSubmissions}</div>
                    <div className="text-sm text-gray-600">Feedback Given</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{Math.round(analytics.userEngagement.userRetention.find(r => r.period === 'Weekly')?.rate * 100 || 0)}%</div>
                    <div className="text-sm text-gray-600">Weekly Retention</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{analytics.userEngagement.supportTickets}</div>
                    <div className="text-sm text-gray-600">Support Tickets</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}