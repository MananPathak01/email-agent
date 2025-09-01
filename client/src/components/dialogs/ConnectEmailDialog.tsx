import { Button } from "@/components/ui/button";
import { Loader2, Mail, X } from "lucide-react";
import { useEffect } from "react";

interface ConnectEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnectGmail: () => void;
  isConnecting: boolean;
}

export const ConnectEmailDialog = ({
  open,
  onOpenChange,
  onConnectGmail,
  isConnecting,
}: ConnectEmailDialogProps) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/80 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div 
        className="relative bg-card text-card-foreground rounded-lg shadow-xl border border-border w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header */}
        <div className="p-6 pb-0">
          <h2 className="text-xl font-semibold leading-none tracking-tight">
            Connect an Email Account
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Select an email provider to connect your account. This will allow the system to read and manage your emails.
          </p>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-3">
          <Button
            onClick={onConnectGmail}
            disabled={isConnecting}
            className="w-full justify-start h-12 text-base hover:bg-secondary/80 transition-colors"
            variant="outline"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Connecting to Gmail...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5 mr-3" />
                <span>Connect with Gmail</span>
              </>
            )}
          </Button>
          
          <Button
            variant="outline"
            disabled
            className="w-full justify-start h-12 text-base opacity-50 cursor-not-allowed"
          >
            <Mail className="w-5 h-5 mr-3" />
            <span>Connect with Outlook (Coming Soon)</span>
          </Button>
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end p-6 pt-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="hover:bg-transparent hover:underline"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
