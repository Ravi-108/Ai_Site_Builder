import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '@/config/axios'; // Make sure this path is correct
import { Plus, Loader2, Trash2, ExternalLink, Code2 } from 'lucide-react';
import { toast } from 'sonner';

// Matched to your Prisma Database Schema
interface Project {
  id: string;
  name: string;
  initial_prompt: string;
  current_code: string;
  createdAt: string;
}

const MyProjects = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);

  // --- FETCH REAL PROJECTS FROM DATABASE ---
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        // Adjust this path if your backend route is different (e.g., '/api/project/all')
        const { data } = await API.get('/api/user/projects'); 
        
        // Assuming your backend returns { projects: [...] } or an array directly
        setProjects(data.projects || data || []); 
      } catch (error: any) {
        console.error("Failed to fetch projects", error);
        toast.error("Failed to load your projects.");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // --- DELETE REAL PROJECT FROM DATABASE ---
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const confirm = window.confirm("Are you sure you want to delete this project? This cannot be undone.");
    if (!confirm) return;

    try {
      // Adjust this path if your backend delete route is different
      await API.delete(`/api/project/${id}`);
      setProjects(projects.filter(p => p.id !== id));
      toast.success("Project deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete the project.");
    }
  };

  return (
    <div className="min-h-[calc(100vh-70px)] bg-[#0b0d14] text-white p-6 md:p-10 font-sans">
      
      {/* --- HEADER --- */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 mt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Projects</h1>
          <p className="text-gray-400 text-sm mt-1">Manage and edit your AI-generated websites.</p>
        </div>
        
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus size={18} />
          Create New
        </button>
      </div>

      {/* --- CONTENT AREA --- */}
      <div className="max-w-7xl mx-auto">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
            <p>Loading your projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-2xl bg-[#11131e]/50">
            <Code2 size={48} className="text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No projects yet</h3>
            <p className="text-gray-400 mb-6 text-center max-w-md">You haven't generated any websites yet. Click the button above to start building with AI.</p>
            <button onClick={() => navigate('/')} className="bg-white text-black px-6 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition-colors">
              Start Building
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div 
                key={project.id}
                onClick={() => navigate(`/builder/${project.id}`)}
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
                      <Code2 size={16} /> Open Builder
                    </span>
                  </div>
                </div>

                {/* Project Details */}
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg truncate pr-4 text-white">{project.name}</h3>
                    <button 
                      onClick={(e) => handleDelete(e, project.id)}
                      className="text-gray-500 hover:text-red-400 p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Project"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-400 line-clamp-2 mb-4 flex-1">
                    {project.initial_prompt}
                  </p>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-800/50 mt-auto">
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </span>
                    
                    <div className="flex gap-2">
                      <Link
                        to={`/preview/${project.id}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()} // Prevent card click from triggering
                        className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors z-10"
                      >
                        <ExternalLink size={12} /> Live Preview
                      </Link>
                    </div>
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

export default MyProjects;