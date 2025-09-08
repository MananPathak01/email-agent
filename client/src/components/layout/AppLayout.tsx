import { ReactNode } from "react";
import Header from "./Header";

interface AppLayoutProps {
    children: ReactNode;
    currentTab?: 'chat' | 'tasks' | 'settings';
    showHeader?: boolean;
}

export default function AppLayout({
    children,
    currentTab = 'chat',
    showHeader = true
}: AppLayoutProps) {
    return (
        <div className="relative flex size-full min-h-screen flex-col bg-gray-100" style={{ fontFamily: 'Inter, "Noto Sans", sans-serif' }}>
            {showHeader && <Header currentTab={currentTab} />}
            <main className="flex-1">
                {children}
            </main>
        </div>
    );
}