import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Save } from "lucide-react";
import { chatApi } from "@/lib/chatApi";
import { toast } from "sonner";

interface GmailAccount {
    id: string;
    email: string;
    isActive: boolean;
    connectionStatus: 'connected' | 'disconnected' | 'error';
    lastConnectedAt: string;
}

interface AutoDraftSettings {
    customInstructions: string;
    tone?: 'professional' | 'casual' | 'friendly' | 'formal';
}

interface AutoDraftSettingsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    connectedEmails: GmailAccount[];
}

export default function AutoDraftSettingsDialog({
    open,
    onOpenChange,
    connectedEmails
}: AutoDraftSettingsDialogProps) {
    const [settings, setSettings] = useState<AutoDraftSettings>({
        customInstructions: "",
        tone: undefined
    });

    const [customInstructionsLength, setCustomInstructionsLength] = useState(0);


    const handleCustomInstructionsChange = (value: string) => {
        if (value.length <= 500) {
            setSettings(prev => ({ ...prev, customInstructions: value }));
            setCustomInstructionsLength(value.length);
        }
    };

    const handleSave = async () => {
        try {
            // Save settings for all connected email accounts
            const savePromises = connectedEmails.map(email =>
                chatApi.updateAutoDraftSettings(email.id, settings)
            );

            const results = await Promise.all(savePromises);

            // Check if all saves were successful
            const allSuccessful = results.every(result => result.success);

            if (allSuccessful) {
                toast.success('Auto-draft settings saved successfully!');
                onOpenChange(false);
            } else {
                toast.error('Failed to save some settings. Please try again.');
            }
        } catch (error) {
            console.error('Error saving auto-draft settings:', error);
            toast.error('Failed to save settings. Please try again.');
        }
    };

    const toneOptions = [
        { value: 'professional', label: 'Professional' },
        { value: 'casual', label: 'Casual' },
        { value: 'friendly', label: 'Friendly' },
        { value: 'formal', label: 'Formal' }
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] bg-white border border-gray-200 shadow-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5 text-gray-600" />
                        Auto-Draft Settings
                    </DialogTitle>
                    <DialogDescription>
                        Customize the tone and instructions for AI-generated email replies.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Tone Selection */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">
                            Reply Tone <span className="text-gray-400">(Optional)</span>
                        </Label>
                        <p className="text-xs text-gray-500">
                            Choose the tone for AI-generated email replies. Leave unselected for default tone.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSettings(prev => ({ ...prev, tone: undefined }))}
                                className={`justify-start ${settings.tone === undefined
                                    ? 'border-2 border-gray-800 bg-gray-50 text-gray-800'
                                    : 'border-2 border-transparent hover:bg-gray-50'}`}
                            >
                                Default
                            </Button>
                            {toneOptions.map((tone) => (
                                <Button
                                    key={tone.value}
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSettings(prev => ({ ...prev, tone: tone.value as any }))}
                                    className={`justify-start ${settings.tone === tone.value
                                        ? 'border-2 border-gray-800 bg-gray-50 text-gray-800'
                                        : 'border-2 border-transparent hover:bg-gray-50'}`}
                                >
                                    {tone.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Instructions */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium text-gray-700">
                            Custom Instructions
                        </Label>
                        <p className="text-xs text-gray-500">
                            Add specific instructions for how the AI should write your emails (max 500 characters).
                        </p>
                        <div className="space-y-2">
                            <Textarea
                                placeholder="e.g., Always include a call-to-action, keep responses concise, mention our company values..."
                                value={settings.customInstructions}
                                onChange={(e) => handleCustomInstructionsChange(e.target.value)}
                                className="min-h-[80px] resize-none rounded-lg border-gray-300 focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
                            />
                            <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>Optional: Add specific writing guidelines</span>
                                <span className={customInstructionsLength > 450 ? "text-orange-500" : ""}>
                                    {customInstructionsLength}/500
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700"
                    >
                        <Save className="h-4 w-4" />
                        Save Settings
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}