import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import API from '@/config/axios';
import { Loader2Icon } from 'lucide-react';

export default function View() {
  const { projectId } = useParams();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicProject = async () => {
      try {
        const { data } = await API.get(`/api/project/published/${projectId}`);
        
        // 🚀 Safely extract the code regardless of backend formatting
        const fetchedCode = data?.code || data?.current_code || data?.project?.current_code;
        
        if (fetchedCode) {
          setCode(fetchedCode);
        } else {
          setError('Project code is empty.');
        }
      } catch (err) {
        console.error("Failed to load public project", err);
        setError('Project not found or is private.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchPublicProject();
  }, [projectId]);

  // --- RENDER ENGINE: Handles both HTML documents and legacy React/JSX ---
  const generateIframeDoc = (websiteCode: string) => {
    if (!websiteCode) return '';

    // PATH 1: If the code is a complete HTML document, use it directly
    const isHtmlDoc = /<!DOCTYPE\s+html/i.test(websiteCode) || /^\s*<html[\s>]/i.test(websiteCode);

    const scrollFixScript = `
      <script>
        document.addEventListener('click', (e) => {
          const link = e.target.closest('a');
          if (link) {
            e.preventDefault();
            e.stopPropagation();
            const href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
              const targetId = href.substring(1);
              if (targetId) {
                const targetEl = document.getElementById(targetId);
                if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
              }
            } else if (href && href.trim() !== '' && !href.startsWith('javascript:')) {
              window.open(href, '_blank');
            }
          }
        }, true);
      <\/script>
    `;

    if (isHtmlDoc) {
      if (websiteCode.includes('</body>')) {
        return websiteCode.replace('</body>', `${scrollFixScript}</body>`);
      }
      return websiteCode + scrollFixScript;
    }

    // PATH 2: Legacy React/JSX code — use the old Babel transpilation pipeline
    let cleanCode = websiteCode;

    const markdownMatch = cleanCode.match(/```[a-zA-Z]*\n([\s\S]*?)```/);
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
          <script type="text/plain" id="ai-code">
${safeCode}
          <\/script>
          <script>
            document.addEventListener('click', (e) => {
              const link = e.target.closest('a');
              if (link) {
                e.preventDefault();
                e.stopPropagation();
                const href = link.getAttribute('href');
                if (href && href.startsWith('#')) {
                  const targetId = href.substring(1);
                  if (targetId) {
                    const targetEl = document.getElementById(targetId);
                    if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
                  }
                } else if (href && href.trim() !== '' && !href.startsWith('javascript:')) {
                  window.open(href, '_blank');
                }
              }
            }, true);
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
              document.getElementById('root').innerHTML = '<div style="color: red; padding: 20px; font-family: monospace;">Render Error: ' + err.message + '</div>';
            }
          <\/script>
        </body>
      </html>
    `;
  };

  // --- UI RENDERING ---
  if (loading) return (
    <div className="min-h-screen bg-[#030305] flex items-center justify-center text-indigo-500">
      <Loader2Icon className="animate-spin size-10" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-[#030305] flex items-center justify-center text-white">
      <h1 className="text-2xl font-bold text-red-500">{error}</h1>
    </div>
  );

  return (
    <div className="w-screen h-screen">
      <iframe 
        title="Live Public Project"
        // 🚀 We now pass the code through the compiler!
        srcDoc={generateIframeDoc(code)}
        className="w-full h-full border-none bg-white"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
} 