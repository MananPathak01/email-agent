import { useAuth } from "@/contexts/AuthContext";
import { getAuth, signOut } from "firebase/auth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/sidebar";

// Mock user ID for demo - in real app this would come from authentication
const CURRENT_USER_ID = 1;

export default function SettingsPage() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    const auth = getAuth();
    try {
      await signOut(auth);
      // You might want to redirect the user to the landing page after sign-out
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar Navigation */}
      <Sidebar userId={CURRENT_USER_ID} />
      {/* Main Content */}
      <div className="flex-1 bg-white">
        <div className="max-w-lg mx-auto py-12 px-4">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>
          <div className="flex items-center space-x-4 mb-8">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.photoURL || "/placeholder-avatar.jpg"} alt="User avatar" />
            <AvatarFallback>{user?.displayName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xl font-semibold">{user ? user.displayName : 'User'}</p>
              <p className="text-gray-500">{user?.email}</p>
            </div>
          </div>
          <Button variant="destructive" onClick={handleSignOut}>Log out</Button>
        </div>
      </div>
    </div>
  );
} 