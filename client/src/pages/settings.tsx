import Header from "@/components/layout/Header";
import { Settings } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="relative flex size-full min-h-screen flex-col bg-gray-100" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
            {/* Header */}
            <Header currentTab="settings" />

            {/* Main Content */}
            <main className="flex flex-1 items-center justify-center">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Settings className="h-8 w-8 text-gray-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Settings</h1>
                    <p className="text-gray-600 mb-4">
                        Coming Soon
                    </p>
                    <p className="text-sm text-gray-500">
                        We are testing this page out and will have it ready soon.
                    </p>
                </div>
            </main>
        </div>
    );
}