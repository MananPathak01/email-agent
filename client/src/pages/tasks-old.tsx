import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import Sidebar from "@/components/sidebar";
import { 
  CheckSquare, 
  Clock, 
  User, 
  Calendar,
  AlertCircle,
  Play,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Settings,
  Zap,
  TrendingUp,
  FileText,
  Edit3,
  Plus,
  Trash2,
  Eye,
  BarChart3,
  Target,
  Workflow
} from "lucide-react";
import { useState } from "react";
import { useWorkflowTemplates } from "@/hooks/useMockApi";
import { WorkflowTemplate } from "@/types";

export default function TasksPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [isEditingWorkflow, setIsEditingWorkflow] = useState(false);
  const [isCreatingWorkflow, setIsCreatingWorkflow] = useState(false);
  const { workflows, loading, error, updateWorkflow, createWorkflow, deleteWorkflow } = useWorkflowTemplates();

  const handleEditWorkflow = (workflow: WorkflowTemplate) => {
    setSelectedWorkflow(workflow);
    setIsEditingWorkflow(true);
  };

  const handleCreateWorkflow = () => {
    setSelectedWorkflow(null);
    setIsCreatingWorkflow(true);
  };

  const handleSaveWorkflow = async (workflowData: Partial<WorkflowTemplate>) => {
    if (selectedWorkflow) {
      await updateWorkflow(selectedWorkflow.id, workflowData);
    } else {
      await createWorkflow(workflowData as Omit<WorkflowTemplate, 'id' | 'usageCount' | 'lastUsed'>);
    }
    setIsEditingWorkflow(false);
    setIsCreatingWorkflow(false);
    setSelectedWorkflow(null);
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    await deleteWorkflow(workflowId);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'onboarding': return 'bg-blue-100 text-blue-800';
      case 'support': return 'bg-green-100 text-green-800';
      case 'sales': return 'bg-purple-100 text-purple-800';
      case 'meeting': return 'bg-orange-100 text-orange-800';
      case 'custom': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCreatedByIcon = (createdBy: string) => {
    return createdBy === 'ai' ? <Zap className="h-4 w-4 text-yellow-500" /> : <User className="h-4 w-4 text-blue-500" />;
  };

  const workflowStats = {
    total: workflows.length,
    active: workflows.filter(w => w.isActive).length,
    aiCreated: workflows.filter(w => w.createdBy === 'ai').length,
    userCreated: workflows.filter(w => w.createdBy === 'user').length,
    averageSuccessRate: workflows.length > 0 ? workflows.reduce((acc, w) => acc + w.successRate, 0) / workflows.length : 0
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
                <Workflow className="h-6 w-6" />
                Workflow Management
              </h1>
              <p className="text-gray-600 mt-1">Manage AI-detected patterns and customize email workflows</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button onClick={handleCreateWorkflow} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Workflow
              </Button>
            </div>
          </div>
          
          {/* Workflow Stats */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Workflows</p>
                  <p className="text-2xl font-bold text-gray-900">{workflowStats.total}</p>
                </div>
                <Workflow className="h-8 w-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Active</p>
                  <p className="text-2xl font-bold text-green-900">{workflowStats.active}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-600">AI Created</p>
                  <p className="text-2xl font-bold text-yellow-900">{workflowStats.aiCreated}</p>
                </div>
                <Zap className="h-8 w-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Avg Success Rate</p>
                  <p className="text-2xl font-bold text-blue-900">{Math.round(workflowStats.averageSuccessRate * 100)}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Workflow List */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {workflows.length === 0 ? (
              <div className="text-center py-12">
                <Workflow className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows detected yet</h3>
                <p className="text-gray-500 mb-4">AI will automatically detect patterns from your email responses and create workflows.</p>
                <Button onClick={handleCreateWorkflow} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Workflow
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {workflows.map((workflow) => (
                  <Card key={workflow.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getCreatedByIcon(workflow.createdBy)}
                          <CardTitle className="text-lg">{workflow.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditWorkflow(workflow)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteWorkflow(workflow.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardDescription>{workflow.description}</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Workflow Metadata */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getCategoryColor(workflow.category)}>
                          {workflow.category}
                        </Badge>
                        <Badge variant={workflow.isActive ? "default" : "secondary"}>
                          {workflow.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">
                          {workflow.createdBy === 'ai' ? 'AI Detected' : 'User Created'}
                        </Badge>
                      </div>

                      {/* Performance Metrics */}
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-lg font-semibold text-gray-900">{workflow.usageCount}</div>
                          <div className="text-xs text-gray-500">Uses</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-green-600">
                            {Math.round(workflow.successRate * 100)}%
                          </div>
                          <div className="text-xs text-gray-500">Success</div>
                        </div>
                        <div>
                          <div className="text-lg font-semibold text-blue-600">
                            {workflow.averageResponseTime.toFixed(1)}m
                          </div>
                          <div className="text-xs text-gray-500">Avg Time</div>
                        </div>
                      </div>

                      {/* Success Rate Progress */}
                      <div>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Success Rate</span>
                          <span className="font-medium">{Math.round(workflow.successRate * 100)}%</span>
                        </div>
                        <Progress value={workflow.successRate * 100} className="h-2" />
                      </div>

                      {/* Trigger Conditions Preview */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Trigger Keywords</h4>
                        <div className="flex flex-wrap gap-1">
                          {workflow.triggerConditions.slice(0, 3).map((condition, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {condition.value}
                            </Badge>
                          ))}
                          {workflow.triggerConditions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{workflow.triggerConditions.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Required Documents */}
                      {workflow.requiredDocuments.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Documents ({workflow.requiredDocuments.length})
                          </h4>
                          <div className="space-y-1">
                            {workflow.requiredDocuments.slice(0, 2).map((doc, index) => (
                              <div key={index} className="text-xs text-gray-600 flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {doc.filename}
                              </div>
                            ))}
                            {workflow.requiredDocuments.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{workflow.requiredDocuments.length - 2} more documents
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tags */}
                      {workflow.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {workflow.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              #{tag}
                            </Badge>
                          ))}
                          {workflow.tags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{workflow.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Last Used */}
                      {workflow.lastUsed && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last used: {new Date(workflow.lastUsed).toLocaleDateString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Workflow Edit/Create Dialog */}
      <Dialog open={isEditingWorkflow || isCreatingWorkflow} onOpenChange={(open) => {
        if (!open) {
          setIsEditingWorkflow(false);
          setIsCreatingWorkflow(false);
          setSelectedWorkflow(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreatingWorkflow ? 'Create New Workflow' : 'Edit Workflow'}
            </DialogTitle>
            <DialogDescription>
              {isCreatingWorkflow 
                ? 'Create a custom workflow template for handling specific types of emails.'
                : 'Modify the workflow template to better match your communication style.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Workflow Name</Label>
                <Input
                  id="name"
                  defaultValue={selectedWorkflow?.name || ''}
                  placeholder="e.g., Client Onboarding"
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  defaultValue={selectedWorkflow?.category || ''}
                  placeholder="e.g., onboarding, support, sales"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                defaultValue={selectedWorkflow?.description || ''}
                placeholder="Brief description of when this workflow is used"
              />
            </div>
            
            <div>
              <Label htmlFor="template">Response Template</Label>
              <Textarea
                id="template"
                defaultValue={selectedWorkflow?.responseTemplate || ''}
                placeholder="Enter your response template with placeholders like {client_name}, {company_name}, etc."
                className="min-h-[120px]"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                defaultChecked={selectedWorkflow?.isActive ?? true}
              />
              <Label htmlFor="active">Active (workflow will be used for matching emails)</Label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => {
                setIsEditingWorkflow(false);
                setIsCreatingWorkflow(false);
                setSelectedWorkflow(null);
              }}>
                Cancel
              </Button>
              <Button onClick={() => handleSaveWorkflow({})}>
                {isCreatingWorkflow ? 'Create Workflow' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}