import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
// 👇 1. Notice we removed the interface from this import!
import EditorPanel from './EditorPanel'; 

// 👇 2. Now it's safe to define the interface AFTER the imports
export interface SelectedElementData {
  tagName: string;
  className: string;
  text: string;
  styles: {
    padding: string;
    margin: string;
    backgroundColor: string;
    color: string;
    fontSize: string;
  };
}

interface ProjectPreviewProps {
  project: any;
  device: 'phone' | 'tablet' | 'desktop';
  isGenerating: boolean;
}

const ProjectPreview: React.FC<ProjectPreviewProps> = ({ project, device, isGenerating }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElementData | null>(null);

  // --- THE MAGIC SCRIPT ---
  // This script gets injected into the AI's HTML. It captures clicks inside the iframe
  // and sends the element's data back to React. It also listens for updates from React.
  const iframeScript = `
    <script id="ai-builder-script">
      let currentSelectedElement = null;

      // Listen for clicks inside the website
      document.addEventListener('click', function(e) {
        e.preventDefault(); // Stop links from navigating away
        e.stopPropagation();

        // Remove outline from previously selected element
        if (currentSelectedElement) {
          currentSelectedElement.style.outline = 'none';
        }

        // Add outline to newly clicked element
        currentSelectedElement = e.target;
        currentSelectedElement.style.outline = '2px solid #4f46e5'; // Indigo color
        currentSelectedElement.style.outlineOffset = '2px';

        // Extract computed styles
        const computedStyles = window.getComputedStyle(currentSelectedElement);

        // Send message to React!
        window.parent.postMessage({
          type: 'elementSelected',
          payload: {
            tagName: currentSelectedElement.tagName.toLowerCase(),
            className: currentSelectedElement.className,
            text: currentSelectedElement.innerText,
            styles: {
              padding: computedStyles.padding,
              margin: computedStyles.margin,
              backgroundColor: computedStyles.backgroundColor,
              color: computedStyles.color,
              fontSize: computedStyles.fontSize,
            }
          }
        }, '*');
      });

      // Listen for updates FROM React
      window.addEventListener('message', function(event) {
        if (event.data.type === 'updateElement' && currentSelectedElement) {
          const { field, value, styleName } = event.data.payload;
          
          if (field === 'text') currentSelectedElement.innerText = value;
          else if (field === 'className') currentSelectedElement.className = value;
          else if (field === 'styles') currentSelectedElement.style[styleName] = value;
        } else if (event.data.type === 'clearSelection' && currentSelectedElement) {
          currentSelectedElement.style.outline = 'none';
          currentSelectedElement = null;
        }
      });
    </script>
  `;

  // Inject the script into the generated code just before the closing </body> tag
  const injectScript = (html: string) => {
    if (!html) return '';
    if (html.includes('</body>')) {
      return html.replace('</body>', `${iframeScript}</body>`);
    }
    return html + iframeScript;
  };

  const htmlContent = injectScript(project?.currentCode || `
    <!DOCTYPE html>
    <html>
      <head><script src="https://cdn.tailwindcss.com"></script></head>
      <body class="p-10 text-center font-sans">
        <h1 class="text-4xl font-bold mb-4">Click me to edit!</h1>
        <p class="text-gray-500 mb-6">This is a paragraph. You can click me too.</p>
        <button class="bg-blue-600 text-white px-6 py-2 rounded-lg">And me!</button>
      </body>
    </html>
  `);

  // Listen for messages coming FROM the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'elementSelected') {
        setSelectedElement(event.data.payload);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send updates TO the iframe
  const handleUpdate = (updates: any) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'updateElement',
        payload: updates
      }, '*');
    }
  };

  // Clear selection
  const handleClose = () => {
    setSelectedElement(null);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'clearSelection' }, '*');
    }
  };

  const getDeviceWidth = () => {
    switch (device) {
      case 'phone': return 'max-w-[375px]';
      case 'tablet': return 'max-w-[768px]';
      default: return 'max-w-full';
    }
  };

  return (
    <div className="relative w-full h-full flex justify-center items-start overflow-hidden pt-4">
      
      {/* Visual Editor Panel */}
      <EditorPanel 
        selectedElement={selectedElement} 
        onUpdate={handleUpdate} 
        onClose={handleClose} 
      />

      <div className={`relative w-full h-full bg-white transition-all duration-500 ease-in-out border border-gray-800 shadow-2xl rounded-t-xl overflow-hidden flex flex-col ${getDeviceWidth()}`}>
        
        {/* Fake Browser Toolbar */}
        <div className="h-10 bg-[#f3f4f6] border-b border-gray-200 flex items-center px-4 gap-2 shrink-0">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
          <div className="flex-1 flex justify-center">
            <div className="bg-white px-4 py-1 rounded-md text-[11px] text-gray-500 border border-gray-200 shadow-sm font-mono flex items-center gap-2">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              {device === 'desktop' ? 'mysite.com' : device === 'tablet' ? 'Tablet View' : 'Mobile View'}
            </div>
          </div>
        </div>

        <iframe 
          ref={iframeRef}
          title="Project Preview"
          className="flex-1 w-full bg-white"
          srcDoc={htmlContent}
          sandbox="allow-scripts allow-same-origin"
        />

        {isGenerating && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-opacity duration-300">
            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Generating your website...</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectPreview;