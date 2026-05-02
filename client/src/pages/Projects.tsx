import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import ProjectPreview from '../components/ProjectPreview';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Save, 
  Eye, 
  Download, 
  Globe, 
  Loader2 
} from 'lucide-react';

// We will import these later when you create them!
// import Sidebar from '../components/Sidebar';
// import ProjectPreview from '../components/ProjectPreview';

const Projects = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();

  // --- TUTORIAL STATES ---
  const [project, setProject] = useState<any>(null); // Holds website data/code
  const [loading, setLoading] = useState(true); // Page load state
  const [isGenerating, setIsGenerating] = useState(false); // AI generation state
  const [device, setDevice] = useState<'phone' | 'tablet' | 'desktop'>('desktop'); // Preview viewport
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Mobile menu state
  const [isSaving, setIsSaving] = useState(false); // Database save state

  // Mock Fetching Project Data (Simulates API call)
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      // Dummy project data until you connect your backend
      setProject({ 
        id: '123', 
  name: 'My Custom Website', 
  isPublished: false,
  currentCode: '<h1>Hello World</h1>',
  currentVersionIndex: 'v1',
  conversations: [
    { id: 'c1', role: 'user', content: 'Create a dark landing page', timestamp: new Date(Date.now() - 10000).toISOString() },
    { id: 'c2', role: 'assistant', content: 'I have created the landing page. How does it look?', timestamp: new Date(Date.now() - 8000).toISOString() }
     ],versions: [
    { id: 'v1', code: '...', description: 'Initial Version', timestamp: new Date(Date.now() - 9000).toISOString() }
  ] });
      setLoading(false);
    }, 1000);
  }, [projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0d14] flex justify-center items-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0b0d14] flex justify-center items-center text-white">
        <p className="text-gray-400">Unable to load project.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#0b0d14] text-white font-sans overflow-hidden">
      
      {/* ==========================================
          BUILDER NAVBAR (Top Bar)
      ========================================== */}
      <div className="h-14 flex items-center justify-between px-4 border-b border-gray-800 shrink-0 bg-[#0b0d14]">
        
        {/* Left: App Logo & Project Info */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => navigate('/')}
            className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center cursor-pointer font-bold shrink-0"
          >
            S {/* Replace with your actual Logo/Favicon */}
          </div>
          <div>
            <p className="text-sm font-medium truncate w-48 sm:w-64">{project.name}</p>
            <p className="text-xs text-gray-500">Previewing last saved version</p>
          </div>
        </div>

        {/* Middle: Device Toggles (Phone / Tablet / Desktop) */}
        <div className="hidden md:flex items-center gap-1 bg-[#11131e] p-1 rounded-lg border border-gray-800">
          <button 
            onClick={() => setDevice('phone')} 
            className={`p-1.5 rounded transition-colors ${device === 'phone' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            <Smartphone size={16} />
          </button>
          <button 
            onClick={() => setDevice('tablet')} 
            className={`p-1.5 rounded transition-colors ${device === 'tablet' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            <Tablet size={16} />
          </button>
          <button 
            onClick={() => setDevice('desktop')} 
            className={`p-1.5 rounded transition-colors ${device === 'desktop' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-white'}`}
          >
            <Monitor size={16} />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 border border-gray-700 rounded hover:bg-gray-800 transition-colors">
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span className="hidden sm:inline">Save</span>
          </button>
          
          <Link to={`/preview/${project.id}`} target="_blank" className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 border border-gray-700 rounded hover:bg-gray-800 transition-colors">
            <Eye size={14} />
            <span className="hidden sm:inline">Preview</span>
          </Link>
          
          <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors">
            <Download size={14} />
            Download
          </button>
          
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors">
            <Globe size={14} />
            <span className="hidden sm:inline">{project.isPublished ? 'Unpublish' : 'Publish'}</span>
          </button>
        </div>
      </div>

      {/* ==========================================
          MAIN WORKSPACE (Sidebar + Canvas)
      ========================================== */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar Space */}
        <div className="w-[380px] bg-[#11131e] border-r border-gray-800 flex flex-col shrink-0">
          <Sidebar 
                project={project} 
                setProject={setProject} 
                isGenerating={isGenerating} 
                setIsGenerating={setIsGenerating} 
              />
          <div className="p-4 text-gray-500 text-sm">Sidebar component will go here...</div>
        </div>

        {/* Right Preview Canvas Space */}
        <div className="flex-1 bg-[#0b0d14] relative flex justify-center p-4 overflow-hidden">
             <ProjectPreview 
                project={project} 
                device={device} 
                isGenerating={isGenerating} 
              />
            
           
        </div>

      </div>

    </div>
  );
};

export default Projects;