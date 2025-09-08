import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import MailWiseLogo from "@/components/ui/MailWiseLogo";

interface HeaderProps {
    currentTab?: 'chat' | 'tasks' | 'settings';
    onTabChange?: (tab: 'chat' | 'tasks' | 'settings') => void;
}

export default function Header({ currentTab = 'chat', onTabChange }: HeaderProps) {
    const [location, setLocation] = useLocation();
    const { user, logout } = useAuth();
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleTabClick = (tab: 'chat' | 'tasks' | 'settings') => {
        const routes = {
            chat: '/chat',
            tasks: '/tasks',
            settings: '/settings'
        };

        setLocation(routes[tab]);
        onTabChange?.(tab);
    };

    const handleSignOut = async () => {
        try {
            await logout();
            setLocation('/login');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    const getUserInitials = () => {
        if (!user?.displayName) return 'U';
        return user.displayName
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase();
    };


    return (
        <header className="flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
            {/* Brand */}
            <div className="flex items-center gap-3">
                <MailWiseLogo className="h-8 w-8 text-gray-900" />
                <h1 className="text-2xl font-bold text-gray-900">MailWise</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1">
                <ul className="flex justify-center gap-4 sm:gap-6 lg:gap-8">
                    <li>
                        <button
                            onClick={() => handleTabClick('chat')}
                            className={`text-sm font-semibold ${currentTab === 'chat'
                                ? 'text-gray-900'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Chat
                        </button>
                    </li>
                    {/* <li>
                        <button
                            onClick={() => handleTabClick('tasks')}
                            className={`text-sm font-medium ${currentTab === 'tasks'
                                ? 'text-gray-900'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Tasks
                        </button>
                    </li> */}
                    <li>
                        <button
                            onClick={() => handleTabClick('settings')}
                            className={`text-sm font-medium ${currentTab === 'settings'
                                ? 'text-gray-900'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Settings
                        </button>
                    </li>
                </ul>
            </nav>

            {/* Right side - Profile */}
            <div className="flex items-center gap-4">
                {/* User Profile */}
                <DropdownMenu open={isProfileOpen} onOpenChange={setIsProfileOpen}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="relative h-8 w-8 rounded-full bg-gray-200 p-0"
                        >
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                                <AvatarFallback className="bg-gray-200 text-black">
                                    <User className="h-4 w-4" />
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => handleTabClick('settings')}>
                            Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleSignOut}>
                            Sign Out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}