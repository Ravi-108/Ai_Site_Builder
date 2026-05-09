import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import openai from '../config/openai.js';

const sanitizeAiHtmlCode = (rawCode: string): string => {
  let code = rawCode || '';

  // 1. Try to extract HTML from markdown code fences (```html ... ```)
  const fenceMatch = code.match(/```(?:html|htm)?\s*\n([\s\S]*?)```/i);
  if (fenceMatch) {
    code = fenceMatch[1].trim();
  } else {
    // Remove any leading/trailing fence markers without content match
    code = code.replace(/^```(?:html|htm)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  // 2. If the AI returned a full HTML document, validate it has actual content
  if (/<!DOCTYPE\s+html/i.test(code) || /^\s*<html[\s>]/i.test(code)) {
    // Check if the document has actual visible body content (not just CSS/JS)
    const hasBodyContent = /<body[\s>][\s\S]*?<(h[1-6]|p|div|section|header|nav|main|article|span|img|ul|ol|table|form)\b/i.test(code);
    if (!hasBodyContent) {
      // The HTML is structurally empty — only has <style> and <script> but no visible elements
      return '';  // Return empty string to trigger the "AI failed" check downstream
    }
    return code.trim();
  }

  // 3. If the response is mostly plain text (AI returned commentary instead of code),
  //    try to find embedded HTML within it
  const embeddedHtml = code.match(/(<!DOCTYPE\s+html[\s\S]*<\/html>)/i);
  if (embeddedHtml) {
    return embeddedHtml[1].trim();
  }

  // 4. Check if the output contains enough HTML tags to be valid markup
  const htmlTagCount = (code.match(/<[a-z][a-z0-9]*[\s>]/gi) || []).length;
  const totalLength = code.length;

  // If less than 3 HTML tags in a long response, it's likely commentary, not code
  if (htmlTagCount < 3 && totalLength > 200) {
    // Return a fallback error page
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; min-height: 100vh; background: #111827; display: flex; align-items: center; justify-content: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .card { text-align: center; padding: 2rem; background: #1f2937; border-radius: 1rem; box-shadow: 0 25px 50px rgba(0,0,0,0.25); max-width: 28rem; }
    .icon { font-size: 3.75rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; font-weight: bold; color: #fff; margin-bottom: 0.5rem; }
    .desc { color: #9ca3af; margin-bottom: 1rem; }
    .tip { font-size: 0.875rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>Generation Failed</h1>
    <p class="desc">The AI returned a text response instead of HTML code. Please try again with a more specific prompt.</p>
    <p class="tip">Tip: Try prompts like "Build a restaurant landing page" or "Create a portfolio website"</p>
  </div>
</body>
</html>`.trim();
  }

  // 5. It has some HTML tags — wrap the snippet in a full document
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
${code}
</body>
</html>`.trim();
};

// --- 1. MAKE REVISION (Update website using AI prompt) ---
export const makeRevision = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const projectId = req.params.projectId as string;
    const message = req.body.message || req.body.prompt;
    const model = req.body.model;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Determine the AI model and its cost
    let aiModelId = 'openrouter/free';
    let cost = 5;

    if (model === 'gemini') {
      aiModelId = 'google/gemini-3-flash-preview';
      cost = 10;
    } else if (model === 'groq') {
      aiModelId = 'meta-llama/llama-3.3-70b-instruct';
      cost = 10;
    }

    // Ensure user has enough credits for a revision
    if (user && user.credits < cost) {
      return res.status(403).json({ message: `Need ${cost} credits to make changes` });
    }

    if (!message || message.trim() === '') {
      return res.status(400).json({ message: 'Please enter a valid prompt' });
    }

    // Find the current project
    const currentProject = await prisma.websiteProject.findFirst({
      where: { id: projectId, userId },
      include: { versions: true },
    });

    if (!currentProject) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Record the user's request in the chat history
    await prisma.conversation.create({
      data: { role: 'user', content: message, projectId },
    });

    // Deduct dynamic credits for the revision
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: cost } },
    });

    // Enhance the revision prompt using AI
    const promptEnhanceResponse = await openai.chat.completions.create({
      model: aiModelId,
      messages: [
        {
          role: 'system',
          content: `You are an expert web developer and designer. Enhance the user's request into a highly detailed technical prompt for modifying an existing website.

CRITICAL INSTRUCTIONS:
1. The final output must be a COMPLETE, self-contained HTML file.
2. Use ONLY vanilla HTML, Tailwind CSS via CDN, and JavaScript. NO React, NO JSX.
3. You MUST include Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>) in the <head>.
4. All JavaScript must be inside <script> tags within the HTML.
5. Emphasize mobile-first responsive design using Tailwind classes (sm:, md:, lg:).
6. Emphasize extremely beautiful, modern, and premium design: professional color palette, modern Google Fonts (e.g., Inter, Outfit), smooth hover transitions, gradients, and soft shadows.
7. All buttons, links, forms, and navigation must be fully functional with JavaScript.
8. The prompt you generate should ask for ONLY the complete HTML code, with no markdown or conversational text.`
        },
        { role: 'user', content: `Enhance this website modification request: "${message}"` },
      ],
      max_tokens: 1000,
    });

    const enhancedPrompt = promptEnhanceResponse.choices[0].message.content || message;

    await prisma.conversation.create({
      data: { role: 'assistant', content: `I have enhanced your prompt to: "${enhancedPrompt}"`, projectId },
    });

    await prisma.conversation.create({
      data: { role: 'assistant', content: 'Now making changes to your website...', projectId },
    });

    // Ask AI to generate the updated code based on the OLD code + NEW prompt
    const codeGenerationResponse = await openai.chat.completions.create({
      model: aiModelId,
      messages: [
        {
          role: 'system', content: `You are a code generator. You ONLY output raw HTML code. You NEVER output explanations, suggestions, or commentary.

Your response must start with <!DOCTYPE html> and end with </html>. Nothing else.

RULES:
- Return a COMPLETE HTML document starting with <!DOCTYPE html>.
- Use ONLY vanilla HTML, Tailwind CSS, and JavaScript. You MUST include Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script> inside the <head>. NO React, NO JSX.
- All custom CSS (if absolutely needed) must be in <style> tags inside the <head>, but prefer Tailwind classes.
- All JavaScript must be in <script> tags at the end of <body>.
- RESPONSIVE DESIGN: Use mobile-first Tailwind classes. The layout must look great on phones, tablets, and desktops. Use Flexbox and Grid.
- EXTREMELY BEAUTIFUL DESIGN: The website must look modern, professional, and premium. Use a cohesive, elegant color palette. Import a modern Google Font via <link> (e.g., Inter, Outfit, or Plus Jakarta Sans) and apply it to the body. Use generous padding/margin, rounded corners (rounded-xl, rounded-2xl), soft drop shadows (shadow-lg, shadow-xl), subtle gradients (bg-gradient-to-r), and smooth hover effects (transition-all duration-300 hover:scale-105) on all interactive elements.
- FUNCTIONAL: Every button must have an onclick handler. Every form must have onsubmit with preventDefault and show feedback. Every navigation link must scroll smoothly to its section using anchor IDs. Include a working hamburger menu for mobile that toggles visibility.
- NEVER include markdown, code fences, or any text that is not HTML code.
- Your entire response must be valid HTML. Do not write a single word outside of HTML tags.` },
        { role: 'user', content: `Modify this website:\n\n${currentProject.current_code}\n\nChange requested: "${enhancedPrompt}"\n\nRespond with ONLY the complete modified HTML. Start your response with <!DOCTYPE html>` },
      ],
      max_tokens: 4000,
    });

    let code = codeGenerationResponse.choices[0].message.content || '';

    // BUG FIX: Refund credits if AI fails to return code
    if (!code) {
      await prisma.conversation.create({
        data: { role: 'assistant', content: 'Unable to generate the code, please try again.', projectId },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: cost } },
      });
      return res.status(500).json({ message: 'AI failed to generate code.' });
    }

    // Sanitize generated code for iframe runtime compatibility
    code = sanitizeAiHtmlCode(code);

    // If sanitizer detected structurally empty HTML (no visible body content), treat as failure
    if (!code) {
      await prisma.conversation.create({
        data: { role: 'assistant', content: 'The AI generated an incomplete website with no visible content. Please try again.', projectId },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: cost } },
      });
      return res.status(500).json({ message: 'AI generated empty HTML. Please try again.' });
    }
    // Create a new version history checkpoint
    const version = await prisma.version.create({
      data: {
        code,
        description: 'Changes made',
        projectId,
      },
    });

    await prisma.conversation.create({
      data: { role: 'assistant', content: 'I have made the changes to your website. You can now preview it.', projectId },
    });

    // Update the active project code
    await prisma.websiteProject.update({
      where: { id: projectId },
      data: { current_code: code, current_version_index: version.id },
    });

    res.json({ message: 'Changes made successfully', code });

  } catch (error: any) {
    console.log(error);
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: 5 } }, // Refund on error
    });
    res.status(500).json({ message: error.message });
  }
};

// --- 2. ROLL BACK TO PREVIOUS VERSION ---
export const rollbackToVersion = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const projectId = req.params.projectId as string;
    const versionId = req.params.versionId as string;

    const project = await prisma.websiteProject.findFirst({
      where: { id: projectId, userId },
      include: { versions: true },
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const version = project.versions.find((v: any) => v.id === versionId);
    if (!version) return res.status(404).json({ message: 'Version not found' });

    // Overwrite the current code with the old version's code
    await prisma.websiteProject.update({
      where: { id: projectId },
      data: { current_code: version.code, current_version_index: version.id },
    });

    await prisma.conversation.create({
      data: { role: 'assistant', content: 'I have rolled back your website to the selected version.', projectId },
    });

    res.json({ message: 'Version rolled back' });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// --- 3. DELETE PROJECT ---
export const deleteProject = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const projectId = req.params.projectId as string;

    await prisma.websiteProject.delete({
      where: { id: projectId, userId },
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// --- 4. GET PROJECT PREVIEW (Code for the iframe) ---
export const getProjectPreview = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const projectId = req.params.projectId as string;

    const project = await prisma.websiteProject.findFirst({
      where: { id: projectId, userId },
      include: { versions: true },
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    res.json(project);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// --- 5. GET PUBLISHED PROJECTS (For the Community Page) ---
export const getPublishedProjects = async (req: Request, res: Response) => {
  try {
    const projects = await prisma.websiteProject.findMany({
      where: { isPublished: true },
      include: { user: true },
      orderBy: { updatedAt: 'desc' }, // Adjusted to snake_case
    });

    res.json({ projects });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// --- 6. GET SINGLE PROJECT BY ID (Public View Page) ---
export const getProjectById = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string;

    const project = await prisma.websiteProject.findFirst({
      where: { id: projectId },
    });

    if (!project || !project.isPublished || !project.current_code) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ code: project.current_code });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// --- 7. SAVE PROJECT CODE (Manual Editor Save) ---
export const saveProjectCode = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const projectId = req.params.projectId as string;
    const { code } = req.body;

    if (!code) return res.status(400).json({ message: 'Code is required' });

    const project = await prisma.websiteProject.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    await prisma.websiteProject.update({
      where: { id: projectId },
      data: { current_code: code, current_version_index: '' },
    });

    res.json({ message: 'Project saved successfully' });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};