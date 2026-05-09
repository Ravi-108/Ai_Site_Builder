import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import API from '@/config/axios';
import { Loader2Icon, Code2Icon, MonitorPlayIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Save, Download ,ExternalLink ,Globe, EyeOff } from 'lucide-react';

function Builder() {
  const { projectId } = useParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [saving, setSaving] = useState(false);
  const [model, setModel] = useState('default');
  const [prompt, setPrompt] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // 🚀 NEW: State for the Click-to-Edit panel
  const [selectedElement, setSelectedElement] = useState<any>(null);

  // 🚀 NEW: Listen for click messages coming from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_SELECTED') {
        setSelectedElement(event.data.payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);


  // 2. Add the Toggle Publish Function
  const handleTogglePublish = async () => {
    try {
      // 🚀 THE FIX: Changed /api/project/... to /api/user/...
      const { data } = await API.get(`/api/user/publish-toggle/${projectId}`);
      
      setIsPublished(!isPublished);
      toast.success(data.message || (isPublished ? "Project unpublished" : "Project published to community!"));
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update publish status.");
    }
  };

  // 3. Add the Download Function
  const handleDownload = () => {
    // This takes the compiled code and creates an actual index.html file for the user to download!
    const blob = new Blob([generateIframeDoc(code)], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'index.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Code downloaded successfully!");
  };



  useEffect(() => {
    const fetchProject = async () => {
      try {
        const { data } = await API.get(`/api/project/preview/${projectId}`);
        setCode(data.current_code);
      } catch (error) {
        console.error("Failed to fetch project", error);
        setCode("Error loading code.");
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const handleSaveCode = async () => {
    try {
      setSaving(true);
      await API.put(`/api/project/save/${projectId}`, { code });
      toast.success("Code saved successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save code.");
    } finally {
      setSaving(false);
    }
  };

  // --- SEND REVISION TO AI ---
  const handleRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isUpdating) return;

    try {
      setIsUpdating(true);
      const { data } = await API.post(`/api/project/revision/${projectId}`, {
        prompt: prompt,
        currentCode: code,
        model: model
      });

      setCode(data.code || data.current_code); 
      setPrompt('');
      toast.success("Website updated successfully!");
      
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to update website.");
    } finally {
      setIsUpdating(false);
    }
  };

  // 🚀 NEW: Send manual text/class updates back into the iframe instantly
  const handleManualUpdate = (field: string, value: string) => {
    if (!selectedElement) return;

    const updatedElement = { ...selectedElement, [field]: value };
    setSelectedElement(updatedElement);

    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'UPDATE_ELEMENT',
        payload: updatedElement
      }, '*');
    }
  };

  // --- THE MAGIC: THIS TURNS CODE INTO A LIVE WEBSITE ---
  const generateIframeDoc = (websiteCode: string) => {
    if (!websiteCode) return '';

    // Helper: the click-to-edit script that gets injected into every preview
    const editorScript = `
      <script>
        // Hover Highlighting
        document.addEventListener('mouseover', (e) => {
          if (e.target.tagName !== 'BODY' && e.target.tagName !== 'HTML' && e.target.tagName !== 'SCRIPT') {
            e.target.style.outline = '2px solid #6366f1';
            e.target.style.outlineOffset = '2px';
            e.target.style.cursor = 'pointer';
          }
        });
        document.addEventListener('mouseout', (e) => {
          e.target.style.outline = '';
          e.target.style.outlineOffset = '';
        });

        // Click Detection
        document.addEventListener('click', (e) => {
          const link = e.target.closest('a');
          if (link) {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
              e.preventDefault();
            }
          }
          e.preventDefault();
          e.stopPropagation();
          if (e.target.tagName === 'BODY' || e.target.tagName === 'HTML') return;
          if (!e.target.id) {
            e.target.id = 'edit-' + Math.random().toString(36).substr(2, 9);
          }
          window.parent.postMessage({
            type: 'ELEMENT_SELECTED',
            payload: {
              id: e.target.id,
              tagName: e.target.tagName,
              textContent: e.target.innerText,
              className: e.target.className,
              src: e.target.tagName === 'IMG' ? e.target.src : undefined
            }
          }, '*');
        });

        // Listen for manual updates from parent
        window.addEventListener('message', (event) => {
          if (event.data.type === 'UPDATE_ELEMENT') {
            const el = document.getElementById(event.data.payload.id);
            if (el) {
              if (event.data.payload.textContent !== undefined && el.tagName !== 'IMG') el.innerText = event.data.payload.textContent;
              if (event.data.payload.className !== undefined) el.className = event.data.payload.className;
              if (event.data.payload.src !== undefined && el.tagName === 'IMG') el.src = event.data.payload.src;
            }
          }
        });
      <\/script>
    `;

    // PATH 1: If the code is a complete HTML document, use it directly (new HTML/CSS/JS path)
    const isHtmlDoc = /<!DOCTYPE\s+html/i.test(websiteCode) || /^\s*<html[\s>]/i.test(websiteCode);

    if (isHtmlDoc) {
      // Inject the editor script before </body>
      if (websiteCode.includes('</body>')) {
        return websiteCode.replace('</body>', `${editorScript}</body>`);
      }
      return websiteCode + editorScript;
    }

    // PATH 2: Legacy React/JSX code — use the old Babel transpilation pipeline
    let cleanCode = websiteCode;

    const markdownMatch = cleanCode.match(/\`\`\`[a-zA-Z]*\n([\s\S]*?)\`\`\`/);
    if (markdownMatch) {
      cleanCode = markdownMatch[1];
    }

    cleanCode = cleanCode.replace(/^\s*import\s+[^\n;]+(?:;\s*)?$/gim, '');
    cleanCode = cleanCode.replace(/^\s*import\s*['"][^'"]+['"]\s*;?\s*$/gim, '');
    cleanCode = cleanCode.replace(/^\s*export\s+default\s+/gim, '');
    cleanCode = cleanCode.replace(/^\s*export\s+(const|function|class)\s+/gim, '$1 ');
    cleanCode = cleanCode.replace(/^\s*module\.exports\s*=.*$/gim, '');
    cleanCode = cleanCode.replace(/^\s*(const|let|var)\s+[^\n=]+\s*=\s*require\([^\)]*\)\s*;?\s*$/gim, '');
    cleanCode = cleanCode.replace(/^\s*require\([^\)]*\)\s*;?\s*$/gim, '');

    const componentMatch =
      cleanCode.match(/const\s+(\w+)\s*=\s*\(/) ||
      cleanCode.match(/function\s+(\w+)\s*\(/) ||
      cleanCode.match(/class\s+(\w+)\s+extends\s+React\.Component/);

    let executableCode = cleanCode; 
    let mainComponent = componentMatch ? componentMatch[1] : 'App';

    if (!componentMatch) {
      executableCode = `const App = () => (\n${cleanCode}\n);`;
      mainComponent = 'App';
    }

    const safeCode = executableCode.replace(/<\/script>/g, '<\\/script>');

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"><\/script>
          <script crossorigin="anonymous" src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
          <script crossorigin="anonymous" src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
          <script crossorigin="anonymous" src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>
        </head>
        <body class="bg-gray-50 text-gray-900">
          <div id="root"></div>
          <div id="error-boundary" style="color: #ff4444; padding: 20px; font-family: monospace; font-weight: bold; white-space: pre-wrap;"></div>
          
          <script type="text/plain" id="ai-code">
${safeCode}
          <\/script>
          
          <script>
            window.onerror = function(msg) {
              document.getElementById('error-boundary').innerText += '\\nBrowser Error: ' + msg;
              return false;
            };

            // Hover Highlighting and Click Detection Script
            document.addEventListener('mouseover', (e) => {
              if (e.target.tagName !== 'BODY' && e.target.tagName !== 'HTML') {
                e.target.style.outline = '2px solid #6366f1';
                e.target.style.outlineOffset = '2px';
                e.target.style.cursor = 'pointer';
              }
            });
            
            document.addEventListener('mouseout', (e) => {
              e.target.style.outline = '';
              e.target.style.outlineOffset = '';
            });

            document.addEventListener('click', (e) => {
              const link = e.target.closest('a');
              if (link) {
                const href = link.getAttribute('href');
                if (href && !href.startsWith('#') && !href.startsWith('javascript')) {
                  e.preventDefault();
                }
              }

              e.preventDefault();
              e.stopPropagation();

              if (e.target.tagName === 'BODY' || e.target.tagName === 'HTML') return;

              if (!e.target.id) {
                e.target.id = 'edit-' + Math.random().toString(36).substr(2, 9);
              }

              // Send clicked element data to React App
              window.parent.postMessage({
                type: 'ELEMENT_SELECTED',
                payload: {
                  id: e.target.id,
                  tagName: e.target.tagName,
                  textContent: e.target.innerText,
                  className: e.target.className,
                  src: e.target.tagName === 'IMG' ? e.target.src : undefined
                }
              }, '*');
            });

            // Listen for manual updates coming back from React App
            window.addEventListener('message', (event) => {
              if (event.data.type === 'UPDATE_ELEMENT') {
                const el = document.getElementById(event.data.payload.id);
                if (el) {
                  if (event.data.payload.textContent !== undefined && el.tagName !== 'IMG') el.innerText = event.data.payload.textContent;
                  if (event.data.payload.className !== undefined) el.className = event.data.payload.className;
                  if (event.data.payload.src !== undefined && el.tagName === 'IMG') el.src = event.data.payload.src;
                }
              }
            });

            try {
              const rawCode = document.getElementById('ai-code').textContent;
              const compiledCode = Babel.transform(rawCode, { 
                presets: ['react', ['env', { modules: false }]] 
              }).code;
              
              const { useState, useEffect, useRef, useMemo, useCallback, Fragment } = React;
              
              const finalExecuteCode = compiledCode + "\\n" +
                "const root = ReactDOM.createRoot(document.getElementById('root'));\\n" +
                "root.render(React.createElement(${mainComponent}));";
              
              eval(finalExecuteCode);
            } catch (err) {
              document.getElementById('error-boundary').innerText = 'React Code Error:\\n' + err.message;
            }
          <\/script>
        </body>
      </html>
    `;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030305] flex flex-col items-center justify-center text-white">
        <Loader2Icon className="animate-spin size-10 text-indigo-500 mb-4" />
        <p>Loading your project...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030305] text-white flex flex-col font-poppins pt-20">
      
      {/* Top Bar / Navigation */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-white/10 bg-black/20">
        
        {/* Left: Title & Tabs */}
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-xl font-bold text-indigo-400">Project Builder</h1>
            <p className="text-xs text-gray-500 truncate w-32">ID: {projectId}</p>
        </div>

        {/* 🚀 NEW: Right Side Action Buttons */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveCode}
            disabled={saving}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-md transition-colors disabled:opacity-50"
          >
            <Save className="size-4" /> {saving ? 'Saving...' : 'Save'}
          </button>

          <button 
            onClick={() => window.open(`/preview/${projectId}`, '_blank')}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-md transition-colors"
          >
            <ExternalLink className="size-4" /> Full Screen
          </button>

          <button 
            onClick={handleDownload}
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-md transition-colors"
          >
            <Download className="size-4" /> Download
          </button>

          <button 
            onClick={handleTogglePublish}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-md transition-colors ${isPublished ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}
          >
            {isPublished ? (
              <><EyeOff className="size-4" /> Unpublish</>
            ) : (
              <><Globe className="size-4" /> Publish</>
            )}
          </button>
        </div>

      </div>

        {/* Toggle Buttons */}
        <div className="flex items-center bg-white/5 p-1 rounded-lg border border-white/10">
          <button 
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <MonitorPlayIcon className="size-4" /> Preview
          </button>
          <button 
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${activeTab === 'code' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            <Code2Icon className="size-4" /> Code
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-8">
        {/* 🚀 BUG FIXED: Cleaned up the ternary operator here! */}
        <div className="relative w-full h-[75vh] bg-white rounded-xl overflow-hidden border border-white/20 shadow-2xl">
          
          {activeTab === 'preview' ? (
             // The Live Website Preview!
            <iframe 
              title="Project Preview"
              srcDoc={generateIframeDoc(code)}
              className="w-full h-full bg-white"
              sandbox="allow-scripts allow-same-origin"
            />
          ) : (
            // The Editable Code View
            <div className="relative w-full h-full">
              <textarea 
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck="false"
                className="w-full h-full p-6 text-sm text-green-400 bg-[#0d0d0d] font-mono outline-none resize-none"
              />
              <button 
                onClick={handleSaveCode}
                disabled={saving}
                className="absolute top-4 right-6 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* 🚀 NEW: The Manual Editor Panel overlay */}
          {selectedElement && activeTab === 'preview' && (
            <div className="absolute top-4 right-4 w-80 bg-[#0d0d0d] border border-white/20 shadow-2xl rounded-xl p-5 z-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-indigo-400">
                  Edit {selectedElement.tagName.toLowerCase()}
                </h3>
                <button 
                  onClick={() => setSelectedElement(null)}
                  className="text-gray-500 hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {selectedElement.tagName === 'IMG' ? (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Image URL (src)</label>
                    <input 
                      type="text"
                      value={selectedElement.src || ''}
                      onChange={(e) => handleManualUpdate('src', e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-indigo-500 outline-none mb-3"
                    />
                    <label className="block text-xs text-gray-400 mb-1">Presets Gallery</label>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                      {[
                        "https://images.unsplash.com/photo-1498050108023-c5249f4df085",
                        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d",
                        "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40",
                        "https://images.unsplash.com/photo-1551288049-bebda4e38f71"
                      ].map((imgUrl, i) => (
                        <img 
                          key={i} 
                          src={imgUrl + "?w=100&h=100&fit=crop"} 
                          onClick={() => handleManualUpdate('src', imgUrl + "?w=800&q=80")}
                          className="w-12 h-12 rounded cursor-pointer hover:ring-2 ring-indigo-500 object-cover shrink-0" 
                          title="Click to apply"
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Text Content</label>
                    <textarea 
                      value={selectedElement.textContent || ''}
                      onChange={(e) => handleManualUpdate('textContent', e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-indigo-500 outline-none resize-none"
                      rows={3}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Tailwind Classes</label>
                  <textarea 
                    value={selectedElement.className}
                    onChange={(e) => handleManualUpdate('className', e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-md p-2 text-sm text-white focus:border-indigo-500 outline-none font-mono resize-none"
                    rows={4}
                  />
                </div>
                
                <div className="pt-2">
                  <button 
                    onClick={() => {
                      setSelectedElement(null);
                      toast.success("Changes applied visually!");
                    }}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-md text-sm transition-colors"
                  >
                    Done Editing
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* THE AI REVISION CHAT BAR */}
      <div className="px-8 pb-8">
        <form onSubmit={handleRevision} className="flex items-center gap-4 bg-white/5 border border-white/10 p-2 rounded-full shadow-2xl">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={isUpdating}
            className="bg-[#0f172a] text-sm text-gray-300 outline-none cursor-pointer border border-gray-700 rounded-full px-4 py-2 focus:ring-1 ring-indigo-500 max-w-[150px] hidden md:block"
          >
            <option value="default">Standard</option>
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
          </select>
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isUpdating}
            placeholder="Ask the AI to change anything (e.g., 'Make the header sticky')..." 
            className="flex-1 bg-transparent border-none outline-none px-4 text-sm text-white placeholder-gray-500 disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={isUpdating || !prompt.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full text-sm font-medium transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isUpdating ? (
              <>
                <Loader2Icon className="animate-spin size-4" /> Updating...
              </>
            ) : 'Update Website'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Builder;