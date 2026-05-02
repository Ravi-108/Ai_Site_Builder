import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import UserProfile from './UserProfile'; // 👈 We import the profile button here!
import { useSession } from '../lib/auth-client';

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 w-full h-[70px] bg-[#030305]/80 backdrop-blur-xl border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        
        {/* Left Side: Logo */}
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6d28d9] to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            SiteBuilder
          </span>
        </Link>

        {/* Middle: Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Home</Link>
          <Link to="/projects" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">My Projects</Link>
          <Link to="/community" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Community</Link>
          <Link to="/pricing" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Pricing</Link>
        </div>

        {/* Right Side: User Profile or Login Button */}
        <div className="flex items-center gap-4">
          {session ? (
            // If logged in, show your shiny new UserProfile component!
            <UserProfile />
          ) : (
            // If NOT logged in, show a standard Get Started button
            <Link 
              to="/auth" 
              className="px-4 py-2 text-sm font-medium text-white bg-[#6d28d9] hover:bg-[#5b21b6] rounded-lg transition-all shadow-[0_0_15px_rgba(109,40,217,0.3)]"
            >
              Get started
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
}