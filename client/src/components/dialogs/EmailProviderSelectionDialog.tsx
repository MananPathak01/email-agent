import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Mail, Loader2, Check, Clock } from "lucide-react";

interface EmailProviderSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConnectGmail: () => Promise<void>;
    isConnecting?: boolean;
}

export default function EmailProviderSelectionDialog({
    open,
    onOpenChange,
    onConnectGmail,
    isConnecting = false,
}: EmailProviderSelectionDialogProps) {
    const handleConnectGmail = async () => {
        try {
            await onConnectGmail();
        } catch (error) {
            console.error('Failed to connect Gmail:', error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-white border border-gray-200 shadow-xl">
                <DialogHeader className="text-center pb-4 bg-white">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Mail className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                    <DialogTitle className="text-xl font-semibold text-gray-900 bg-white">
                        Connect Email Account
                    </DialogTitle>
                    <DialogDescription className="text-gray-600 mt-2 bg-white">
                        Choose your email provider to get started with AI-powered email assistance.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 bg-white">
                    {/* Gmail Option */}
                    <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors cursor-pointer group bg-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center group-hover:bg-red-100 transition-colors">
                                    <Mail className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">Gmail</h3>
                                    <p className="text-sm text-gray-500">Connect your Gmail account</p>
                                </div>
                            </div>
                            <Button
                                onClick={handleConnectGmail}
                                disabled={isConnecting}
                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white"
                            >
                                {isConnecting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : null}
                                {isConnecting ? 'Connecting...' : 'Connect'}
                            </Button>
                        </div>
                    </div>

                    {/* Outlook Option - Coming Soon */}
                    <div className="border border-gray-200 rounded-lg p-4 opacity-60 cursor-not-allowed bg-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                                        <path fill="#0078D4" d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">Outlook</h3>
                                    <p className="text-sm text-gray-500">Microsoft Outlook support</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-500 text-sm rounded-full">
                                <Clock className="h-3 w-3" />
                                Coming Soon
                            </div>
                        </div>
                    </div>

                    {/* Yahoo Option - Coming Soon */}
                    <div className="border border-gray-200 rounded-lg p-4 opacity-60 cursor-not-allowed bg-white">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                                        <path fill="#7B0099" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-medium text-gray-900">Yahoo Mail</h3>
                                    <p className="text-sm text-gray-500">Yahoo Mail support</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-500 text-sm rounded-full">
                                <Clock className="h-3 w-3" />
                                Coming Soon
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 bg-white">
                    <p className="text-xs text-gray-500 text-center bg-white">
                        We'll securely connect to your email account to help you manage your emails with AI assistance.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}