import React from 'react';
import { authClient } from '@/lib/auth-client';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserProfile() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  if (!session?.user) return null;

  const handleLogout = async () => {
    await authClient.signOut();
    navigate('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <Avatar className="h-10 w-10 ring-2 ring-indigo-500/30 transition-all hover:ring-indigo-500 hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] cursor-pointer">
          <AvatarImage src={session.user.image || ''} alt={session.user.name || 'User'} />
          <AvatarFallback className="bg-indigo-950 text-indigo-200 font-semibold border border-indigo-500/20">
            {session.user.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-[#0a0a0f]/95 backdrop-blur-xl border-indigo-500/20 text-white shadow-xl shadow-indigo-900/20 rounded-xl mt-2">
        <DropdownMenuLabel className="font-normal p-3">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-indigo-100">{session.user.name}</p>
            <p className="text-xs leading-none text-indigo-300/70 mt-1">
              {session.user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-indigo-500/20" />
        <DropdownMenuItem className="hover:bg-indigo-500/20 focus:bg-indigo-500/20 focus:text-indigo-100 cursor-pointer text-indigo-200/90 py-2.5 px-3 rounded-lg mx-1 my-1 transition-colors" onClick={() => navigate('/projects')}>
          <User className="mr-2 h-4 w-4" />
          <span>My Projects</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="hover:bg-indigo-500/20 focus:bg-indigo-500/20 focus:text-indigo-100 cursor-pointer text-indigo-200/90 py-2.5 px-3 rounded-lg mx-1 my-1 transition-colors" onClick={() => navigate('/pricing')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Billing & Credits</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-indigo-500/20" />
        <DropdownMenuItem className="hover:bg-red-500/20 focus:bg-red-500/20 focus:text-red-400 cursor-pointer text-red-400/90 py-2.5 px-3 rounded-lg mx-1 mb-1 transition-colors" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}