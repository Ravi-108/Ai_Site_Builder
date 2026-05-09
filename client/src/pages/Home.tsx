import { Loader2Icon, Cpu, Sparkles, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '@/lib/auth-client';
import API from '@/config/axios';
import { toast } from 'sonner';

function Home() {
  const [input, setInput] = useState('');
  const [model, setModel] = useState('default');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { data: session } = authClient.useSession(); // Check if user is logged in

  const onSubmitHandler = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Guard clause: Ensure user is logged in
    if (!session?.user) {
      toast.error('Please log in to generate a website.');
      navigate('/auth/signin');
      return;
    }

    // 2. Guard clause: Ensure prompt isn't empty
    if (!input.trim()) {
      toast.error('Please describe what you want to build.');
      return;
    }

    setLoading(true);

    try {
      // 3. Send the prompt and selected model to our AI backend!
      const { data } = await API.post('/api/user/project', {
        initialPrompt: input,
        model,
      });

      toast.success('Website generated successfully!');
      
      // 4. Redirect the user to their newly created project editor
      navigate(`/builder/${data.projectId}`); 
      
    } catch (error: any) {
      // Show the exact error from our backend (e.g., "Add credit to create more projects")
      toast.error(error.response?.data?.message || 'Failed to generate website');
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex flex-col items-center text-white text-sm pb-20 px-4 font-poppins">
        <a href="https://example.com" className="flex items-center gap-2 border border-slate-700 rounded-full p-1 pr-3 text-sm mt-20">
          <span className="bg-indigo-600 text-xs px-3 py-1 rounded-full">NEW</span>
          <p className="flex items-center gap-2">
            <span>Try 30 days free trial option</span>
            <svg className="mt-px" width="6" height="9" viewBox="0 0 6 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m1 1 4 3.5L1 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </p>
        </a>

        {/* Updated text to match Website Builder */}
        <h1 className="text-center text-[40px] leading-[48px] md:text-6xl md:leading-[70px] mt-4 font-semibold max-w-3xl">
          Turn thoughts into websites instantly, with AI.
        </h1>

        <p className="text-center text-base max-w-md mt-2">
          Create, customize and deploy faster than ever with intelligent code powered by AI.
        </p>

        <form onSubmit={onSubmitHandler} className="bg-white/10 max-w-2xl w-full rounded-xl p-4 mt-10 border border-indigo-600/70 focus-within:ring-2 ring-indigo-500 transition-all">
          <textarea 
            onChange={e => setInput(e.target.value)} 
            value={input}
            className="bg-transparent outline-none text-gray-300 resize-none w-full" 
            rows={4} 
            placeholder="Describe the website you want to build in detail..." 
            required 
            disabled={loading} // Prevent typing while AI is generating
          />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <button 
                type="button" 
                onClick={() => setModel('default')} 
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm flex items-center gap-2 transition-all ${model === 'default' ? 'bg-indigo-600/20 border-indigo-500 text-indigo-100 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
              >
                <Cpu className="w-4 h-4" /> Standard (5 cr)
              </button>
              <button 
                type="button" 
                onClick={() => setModel('gemini')} 
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm flex items-center gap-2 transition-all ${model === 'gemini' ? 'bg-purple-600/20 border-purple-500 text-purple-100 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
              >
                <Sparkles className={`w-4 h-4 ${model === 'gemini' ? 'text-purple-300' : 'text-purple-500'}`} /> Gemini Pro (10 cr)
              </button>
              <button 
                type="button" 
                onClick={() => setModel('groq')} 
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg border text-xs sm:text-sm flex items-center gap-2 transition-all ${model === 'groq' ? 'bg-amber-600/20 border-amber-500 text-amber-100 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
              >
                <Zap className={`w-4 h-4 ${model === 'groq' ? 'text-amber-300' : 'text-amber-500'}`} /> Groq Fast (10 cr)
              </button>
            </div>
            <button 
              disabled={loading} // Prevent double-clicking
              className="flex items-center gap-2 bg-gradient-to-r from-[#CB52D4] to-indigo-600 rounded-md px-6 py-2.5 disabled:opacity-50 font-medium transition-all hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] w-full sm:w-auto justify-center"
            >
              {loading ? 'Generating...' : 'Create Website'}
              {loading && <Loader2Icon className='animate-spin size-4 text-white' />}
            </button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-center gap-16 md:gap-20 mx-auto mt-16">
          <img className="max-w-28 md:max-w-32" src="https://saasly.prebuiltui.com/assets/companies-logo/framer.svg" alt="" />
          <img className="max-w-28 md:max-w-32" src="https://saasly.prebuiltui.com/assets/companies-logo/huawei.svg" alt="" />
          <img className="max-w-28 md:max-w-32" src="https://saasly.prebuiltui.com/assets/companies-logo/instagram.svg" alt="" />
          <img className="max-w-28 md:max-w-32" src="https://saasly.prebuiltui.com/assets/companies-logo/microsoft.svg" alt="" />
          <img className="max-w-28 md:max-w-32" src="https://saasly.prebuiltui.com/assets/companies-logo/walmart.svg" alt="" />
        </div>
      </section>
  );
}

export default Home;