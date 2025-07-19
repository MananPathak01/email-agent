import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, Check, ArrowRight } from "lucide-react";

interface EmailCardProps {
  email: {
    id: number;
    subject: string;
    fromEmail: string;
    fromName?: string;
    content: string;
    priority: 'low' | 'medium' | 'high';
    category?: string;
    status: string;
    receivedAt: string;
  };
  onAction: (action: string) => void;
  isLoading?: boolean;
}

export default function EmailCard({ email, onAction, isLoading }: EmailCardProps) {
  const getPriorityColor = (priority: string) => {
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
      case 'pending':
        return 'bg-warning bg-opacity-10 text-warning';
      case 'processed':
        return 'bg-success bg-opacity-10 text-success';
      case 'replied':
        return 'bg-success bg-opacity-10 text-success';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3 mr-1" />;
      case 'processed':
      case 'replied':
        return <Check className="h-3 w-3 mr-1" />;
      default:
        return <Clock className="h-3 w-3 mr-1" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getActionButton = () => {
    switch (email.status) {
      case 'pending':
        return (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onAction('reply')}
            disabled={isLoading}
            className="text-primary hover:text-primary-dark text-xs"
          >
            {isLoading ? 'Sending...' : 'Reply with template →'}
          </Button>
        );
      case 'processed':
        return (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onAction('schedule')}
            className="text-primary hover:text-primary-dark text-xs"
          >
            Schedule →
          </Button>
        );
      default:
        return (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onAction('view')}
            className="text-primary hover:text-primary-dark text-xs"
          >
            View →
          </Button>
        );
    }
  };

  return (
    <div className="email-card bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">
            {email.fromName || email.fromEmail.split('@')[0]}
          </span>
          <span className="text-xs text-gray-500 truncate max-w-32">
            {email.fromEmail}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {formatTime(email.receivedAt)}
        </span>
      </div>
      
      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
        {email.subject}
      </p>
      
      <p className="text-xs text-gray-500 mb-3 line-clamp-1">
        {email.content.substring(0, 80)}...
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge 
            variant="secondary" 
            className={`text-xs font-medium ${getPriorityColor(email.priority)}`}
          >
            {email.priority.charAt(0).toUpperCase() + email.priority.slice(1)} Priority
          </Badge>
          
          <Badge 
            variant="secondary" 
            className={`inline-flex items-center text-xs font-medium ${getStatusColor(email.status)}`}
          >
            {getStatusIcon(email.status)}
            {email.status === 'pending' ? 'Pending Response' : 
             email.status === 'processed' ? 'Ready to Process' :
             email.status === 'replied' ? 'Replied' : email.status}
          </Badge>
        </div>
        
        {getActionButton()}
      </div>
      
      {email.category && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Category: <span className="font-medium">{email.category}</span>
          </span>
        </div>
      )}
    </div>
  );
}
