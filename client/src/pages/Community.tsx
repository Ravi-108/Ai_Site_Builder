import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '@/config/axios';
import { Loader2, Globe, ExternalLink, Code2 } from 'lucide-react';
import { toast } from 'sonner';

interface PublishedProject {
  id: string;
  name: string;
  initial_prompt: string;
  current_code: string;
  createdAt: string;
  user?: {
    name: string;
  };
}

const Community = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<PublishedProject[]>([]);
useEffect(() => {
    const fetchPublishedProjects = async () => {
      try {
        const { data } = await API.get('/api/project/published');
        
        // 🚀 THE FIX: Safely extract the array regardless of how your backend formatted the JSON
        const projectsArray = Array.isArray(data) ? data : (data?.projects || []);
        
        setProjects(projectsArray);
      } catch (error: any) {
        console.error("Failed to fetch community projects", error);
        toast.error("Failed to load the community showcase.");
        setProjects([]); // Fallback to an empty array so the page doesn't crash
      } finally {
        setLoading(false);
      }
    };

    fetchPublishedProjects();
  }, []);

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#0b0d14] text-white p-6 md:p-10 font-sans">
      
      {/* --- HEADER --- */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 mt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Globe className="text-indigo-500 size-8" />
            Community Showcase
          </h1>
          <p className="text-gray-400 text-sm mt-2">
            Discover and explore incredible AI-generated websites created by other users.
          </p>
        </div>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="max-w-7xl mx-auto">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <p>Loading community projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-2xl bg-[#11131e]/50">
            <Globe size={48} className="text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No public projects yet</h3>
            <p className="text-gray-400 mb-6 text-center max-w-md">
              Be the first to publish a website! Go to your projects and hit "Publish".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id}
                onClick={() => window.open(`/view/${project.id}`, '_blank')}
                className="bg-[#11131e] border border-gray-800 rounded-xl overflow-hidden group hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer flex flex-col"
              >
                
                {/* Iframe Mini-Preview Trick */}
                <div className="relative h-48 bg-white overflow-hidden border-b border-gray-800">
                  {project.current_code ? (
                    <div className="absolute inset-0 pointer-events-none">
                      <iframe
                        title={`Preview of ${project.name}`}
                        srcDoc={project.current_code}
                        sandbox="allow-scripts allow-same-origin"
                        className="border-none"
                        style={{
                          width: '400%',
                          height: '400%',
                          transform: 'scale(0.25)',
                          transformOrigin: 'top left'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900 text-gray-500">
                      No Preview Available
                    </div>
                  )}
                  
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
                      <ExternalLink size={16} /> View Website
                    </span>
                  </div>
                </div>

                {/* Project Details */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-semibold text-lg truncate mb-2 text-white">{project.name}</h3>
                  
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-1">
                    {project.initial_prompt}
                  </p>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-800/50 mt-auto">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-400 text-xs font-bold">
                        {project.user?.name ? project.user.name.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <span className="text-xs text-gray-400">
                        {project.user?.name || 'Anonymous'}
                      </span>
                    </div>
                    
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Community;