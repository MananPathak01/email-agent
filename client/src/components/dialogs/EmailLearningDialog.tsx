import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Mail, CheckCircle, X, AlertCircle } from "lucide-react";

import { EmailContext } from "./EmailContextDialog";

interface EmailLearningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmail: string;
}

interface LearningProgress {
  stage: 'starting' | 'inbox' | 'sent' | 'context' | 'saving' | 'complete' | 'error';
  message: string;
  progress: number;
  details?: string;
  emailsCollected?: {
    inbox: number;
    sent: number;
    context: number;
    total: number;
  };
}

export const EmailLearningDialog = ({
  open,
  onOpenChange,
  userEmail,
  emailContext,
}: EmailLearningDialogProps) => {
  const [learningProgress, setLearningProgress] = useState<LearningProgress>({
    stage: 'starting',
    message: 'Initializing email learning...',
    progress: 0
  });

  const [isLearning, setIsLearning] = useState(false);

  useEffect(() => {
    if (open && !isLearning) {
      startLearning();
    }
  }, [open]);

  const startLearning = async () => {
    setIsLearning(true);
    
    try {
      // Start the learning process
      setLearningProgress({
        stage: 'starting',
        message: 'Starting email collection...',
        progress: 5
      });

      console.log('Starting learning for email:', userEmail);
      
      const response = await fetch('/api/gmail/learn-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({
          email: userEmail,
          context: emailContext
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to start learning: ${response.status}`);
      }

      // Start polling for progress
      pollLearningProgress();

    } catch (error) {
      console.error('Learning error:', error);
      setLearningProgress({
        stage: 'error',
        message: 'Failed to start email learning',
        progress: 0,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const getAuthToken = async () => {
    // Get Firebase auth token
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    if (auth.currentUser) {
      return await auth.currentUser.getIdToken();
    }
    throw new Error('Not authenticated');
  };

  const pollLearningProgress = async () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/gmail/learning-progress', {
          headers: {
            'Authorization': `Bearer ${await getAuthToken()}`
          }
        });

        if (response.ok) {
          const progress: LearningProgress = await response.json();
          setLearningProgress(progress);

          if (progress.stage === 'complete' || progress.stage === 'error') {
            clearInterval(pollInterval);
            setIsLearning(false);
          }
        }
      } catch (error) {
        console.error('Progress polling error:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup after 10 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsLearning(false);
    }, 600000);
  };

  const getStageIcon = () => {
    switch (learningProgress.stage) {
      case 'complete':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />;
      default:
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
    }
  };

  const getProgressColor = () => {
    switch (learningProgress.stage) {
      case 'complete':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white rounded-lg shadow-xl border w-full max-w-md">
        {/* Close button - only show when complete or error */}
        {(learningProgress.stage === 'complete' || learningProgress.stage === 'error') && (
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center space-x-3">
            {getStageIcon()}
            <div>
              <h2 className="text-xl font-semibold">
                {learningProgress.stage === 'complete' ? 'Learning Complete!' :
                 learningProgress.stage === 'error' ? 'Learning Failed' :
                 'Learning from Your Emails'}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {learningProgress.stage === 'complete' 
                  ? `Successfully analyzed emails from ${userEmail}`
                  : `Analyzing emails from ${userEmail}`}
              </p>
            </div>
          </div>
        </div>
        
        {/* Progress */}
        <div className="px-6 pb-4">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{learningProgress.message}</span>
              <span className="text-gray-500">{learningProgress.progress}%</span>
            </div>
            
            <Progress 
              value={learningProgress.progress} 
              className="h-2"
            />

            {learningProgress.details && (
              <p className="text-xs text-gray-500">{learningProgress.details}</p>
            )}

            {learningProgress.emailsCollected && (
              <div className="bg-gray-50 rounded-lg p-3 mt-4">
                <h4 className="text-sm font-medium mb-2">Emails Collected:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span>Inbox:</span>
                    <span className="font-medium">{learningProgress.emailsCollected.inbox}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sent:</span>
                    <span className="font-medium">{learningProgress.emailsCollected.sent}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Context:</span>
                    <span className="font-medium">{learningProgress.emailsCollected.context}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total:</span>
                    <span>{learningProgress.emailsCollected.total}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end p-6 pt-0 border-t">
          {learningProgress.stage === 'complete' ? (
            <Button onClick={() => onOpenChange(false)} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Done
            </Button>
          ) : learningProgress.stage === 'error' ? (
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={startLearning} disabled={isLearning}>
                Try Again
              </Button>
            </div>
          ) : (
            <div className="flex items-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              This may take 1-2 minutes...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};