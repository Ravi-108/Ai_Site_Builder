import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, History, Link as LinkIcon, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

// --- TypeScript Interfaces ---
// These match the database schema used in the tutorial
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | Date;
}

export interface Version {
  id: string;
  code: string;
  description: string;
  timestamp: string | Date;
}

interface SidebarProps {
  project: any; // In a full app, type this properly
  setProject: React.Dispatch<React.SetStateAction<any>>;
  isGenerating: boolean;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  isMenuOpen?: boolean; // For mobile toggle
}

const Sidebar: React.FC<SidebarProps> = ({
  project,
  setProject,
  isGenerating,
  setIsGenerating,
  isMenuOpen = true,
}) => {
  const [input, setInput] = useState('');
  const messageRef = useRef<HTMLDivElement>(null);

  // 1. COMBINE AND SORT TIMELINE
  // We extract both conversations and versions, combine them into one array, 
  // and sort them chronologically by their timestamp.
  const timeline = [
    ...(project?.conversations || []),
    ...(project?.versions || [])
  ].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // 2. AUTO-SCROLL TO BOTTOM
  // Triggers whenever the timeline length changes or generating state changes
  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [timeline.length, isGenerating]);

  // 3. HANDLE NEW PROMPT SUBMISSION
  const handleRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    // Simulate sending the prompt (You will replace this with the actual API call later)
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    // Optimistically update the UI
    setProject((prev: any) => ({
      ...prev,
      conversations: [...(prev?.conversations || []), newUserMessage],
    }));
    setInput('');
    setIsGenerating(true);

    // TODO: Call your backend API here
    // Example: await axios.post(`/api/project/revision/${project.id}`, { message: input });
    
    // Simulating backend response after 3 seconds for UI testing
    setTimeout(() => {
      setIsGenerating(false);
      // In the real app, the backend will return the updated project data 
      // containing the new version and assistant reply, and you'll setProject(data).
    }, 3000);
  };

  const handleRollback = async (versionId: string) => {
    const confirm = window.confirm("Are you sure you want to roll back to this version?");
    if (!confirm) return;
    
    // TODO: Call your backend rollback API here
    console.log("Rolling back to version:", versionId);
  };

  return (
    <div className={`flex flex-col h-full bg-[#11131e] border-r border-gray-800 transition-all duration-300 ${isMenuOpen ? 'w-full md:w-[380px]' : 'w-0 overflow-hidden border-none'}`}>
      
      {/* --- MESSAGES & VERSIONS TIMELINE --- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        
        {/* Check if we have no history yet */}
        {timeline.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-10">
            No history yet. Start by describing your website below!
          </div>
        )}

        {/* Map through the combined timeline */}
        {timeline.map((item) => {
          // Detect if this item is a Message (has content) or a Version (has code)
          const isMessage = 'content' in item;

          if (isMessage) {
            // Render Chat Bubble
            const msg = item as Message;
            const isUser = msg.role === 'user';

            return (
              <div key={msg.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {/* AI Avatar */}
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 mt-1 border border-indigo-500/30">
                    <Bot size={18} />
                  </div>
                )}

                {/* Bubble */}
                <div className={`p-3 text-sm rounded-xl max-w-[85%] leading-relaxed shadow-sm ${
                  isUser 
                    ? 'bg-indigo-600 text-white rounded-tr-sm' 
                    : 'bg-[#1e2130] text-gray-200 rounded-tl-sm border border-gray-800'
                }`}>
                  {msg.content}
                </div>

                {/* User Avatar */}
                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0 mt-1 border border-gray-700">
                    <User size={18} className="text-gray-400" />
                  </div>
                )}
              </div>
            );
          } else {
            // Render Version History Card
            const version = item as Version;
            const isCurrentVersion = project?.currentVersionIndex === version.id;

            return (
              <div key={version.id} className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-1 border border-blue-500/30">
                  <History size={16} />
                </div>
                <div className="bg-[#151822] border border-blue-900/50 rounded-xl p-4 w-full max-w-[85%] rounded-tl-sm shadow-sm">
                  <p className="text-sm font-medium text-blue-400 mb-1">Code Updated</p>
                  <p className="text-xs text-gray-500 mb-3">
                    {new Date(version.timestamp).toLocaleString()}
                  </p>
                  <div className="flex flex-col gap-2">
                    {isCurrentVersion ? (
                      <button disabled className="w-full py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 rounded-md border border-blue-600/30 cursor-default">
                        Current Version
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleRollback(version.id)}
                        className="w-full py-1.5 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md transition-colors"
                      >
                        Roll back to this version
                      </button>
                    )}
                    <Link 
                      to={`/preview/${project?.id}/${version.id}`} 
                      target="_blank"
                      className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
                    >
                      <LinkIcon size={12} /> Preview Version
                    </Link>
                  </div>
                </div>
              </div>
            );
          }
        })}

        {/* --- GENERATING ANIMATION --- */}
        {isGenerating && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center shrink-0 mt-1 border border-indigo-500/30">
              <Bot size={18} />
            </div>
            <div className="bg-[#1e2130] p-4 rounded-xl rounded-tl-sm border border-gray-800 flex items-center gap-1.5 h-11 shadow-sm">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        {/* Invisible div to target the auto-scroll */}
        <div ref={messageRef} />
      </div>

      {/* --- INPUT FORM --- */}
      <div className="p-4 bg-[#0b0d14] border-t border-gray-800 shrink-0">
        <form onSubmit={handleRevision} className="relative">
          <textarea
            rows={3}
            className="w-full bg-[#1e2130] border border-gray-700 rounded-lg py-3 px-4 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none shadow-inner"
            placeholder="Ask AI to make changes (e.g. 'Make the hero section blue')..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Submit on Enter, drop line on Shift+Enter
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleRevision(e as any);
              }
            }}
            disabled={isGenerating}
          />
          <button
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="absolute right-3 bottom-4 p-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-md transition-all shadow-md"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
        <div className="flex justify-between items-center mt-2 px-1">
          <p className="text-[10px] text-gray-500">
            Shift + Enter for new line
          </p>
          <p className="text-[10px] text-gray-500">
            AI can make mistakes.
          </p>
        </div>
      </div>

    </div>
  );
};

export default Sidebar;