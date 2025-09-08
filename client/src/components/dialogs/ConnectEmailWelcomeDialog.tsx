import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Loader2 } from "lucide-react";
import MailWiseLogo from "@/components/ui/MailWiseLogo";

interface ConnectEmailWelcomeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConnectGmail: () => Promise<void>;
}

export default function ConnectEmailWelcomeDialog({
    open,
    onOpenChange,
    onConnectGmail,
}: ConnectEmailWelcomeDialogProps) {
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnectGmail = async () => {
        setIsConnecting(true);
        try {
            await onConnectGmail();
        } catch (error) {
            console.error('Failed to connect Gmail:', error);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <MailWiseLogo className="h-8 w-8 text-gray-700" />
                        </div>
                    </div>
                    <DialogTitle className="text-xl font-semibold">Welcome to MailWise</DialogTitle>
                    <DialogDescription className="text-gray-600 mt-2">
                        Let's connect to an email account that you want to work with.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-6">
                    <Button
                        onClick={handleConnectGmail}
                        disabled={isConnecting}
                        className="w-full flex items-center justify-center gap-3 h-12"
                        size="lg"
                    >
                        {isConnecting ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                            <Mail className="h-5 w-5" />
                        )}
                        {isConnecting ? 'Connecting...' : 'Connect Gmail Account'}
                    </Button>

                    <p className="text-xs text-gray-500 text-center">
                        We'll securely connect to your Gmail account to help you manage your emails with AI assistance.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}