import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import openai from '../config/openai.js';

const sanitizeAiReactCode = (rawCode: string) => {
  let code = rawCode || '';

  // Remove markdown wrappers if present
  code = code.replace(/^```(?:html|tsx|jsx|js)?\s*/i, '').replace(/```\s*$/i, '').trim();

  // Remove import/export/module lines that break iframe runtime execution
  code = code.replace(/^\s*import\s+[^\n;]+(?:;\s*)?$/gim, '');
  code = code.replace(/^\s*import\s*['"][^'"]+['"]\s*;?\s*$/gim, '');
  code = code.replace(/^\s*export\s+default\s+/gim, '');
  code = code.replace(/^\s*export\s+(const|function|class)\s+/gim, '$1 ');
  code = code.replace(/^\s*module\.exports\s*=.*$/gim, '');
  code = code.replace(/^\s*(?:const|let|var)\s+[^\n=]+\s*=\s*require\([^\)]*\)\s*;?\s*$/gim, '');
  code = code.replace(/^\s*require\([^\)]*\)\s*;?\s*$/gim, '');

  const hasComponentDeclaration =
    /\b(?:const|function|class)\s+\w+/m.test(code) ||
    /=>\s*\(/m.test(code);

  // If the model returns only JSX markup/fragments, wrap it into App.
  if (code.trim() && !hasComponentDeclaration) {
    code = `const App = () => (\n${code}\n);`;
  }

  return code.trim();
};

// --- 1. MAKE REVISION (Update website using AI prompt) ---
export const makeRevision = async (req: Request, res: Response) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const projectId = req.params.projectId as string;
    const { message } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Ensure user has at least 5 credits for a revision
    if (user && user.credits < 5) {
      return res.status(403).json({ message: 'Add more credit to make changes' });
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

    // Deduct 5 credits for the revision
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: 5 } },
    });

    // Enhance the revision prompt using AI
    const promptEnhanceResponse = await openai.chat.completions.create({
      model: 'openrouter/free',
      messages: [
        { role: 'system', content: 'You are an expert web designer. Enhance the user request into a precise prompt for a single-file React component named App that runs in browser Babel without imports, exports, require, or module syntax.' },
        { role: 'user', content: `User's request: "${message}"` },
      ],
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
      model: 'openrouter/free',
      messages: [
        { role: 'system', content: 'You are an expert React developer. Modify the provided component and return ONLY runnable JSX/React for a single component named App. Do not include import/export/require/module syntax, ReactDOM.render/createRoot, or markdown code fences.' },
        { role: 'user', content: `Here is the current website code: "${currentProject.current_code}". The user wants this change: "${enhancedPrompt}"` },
      ],
    });

    let code = codeGenerationResponse.choices[0].message.content || '';

    // BUG FIX: Refund credits if AI fails to return code
    if (!code) {
      await prisma.conversation.create({
        data: { role: 'assistant', content: 'Unable to generate the code, please try again.', projectId },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: 5 } },
      });
      return res.status(500).json({ message: 'AI failed to generate code.' });
    }

    // Sanitize generated code for iframe runtime compatibility
    code = sanitizeAiReactCode(code);

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

    res.json({ message: 'Changes made successfully' });

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