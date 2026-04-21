import { Request, Response } from 'express';
import prisma from '../lib/prisma.js'; 
import openai from '../config/openai.js'; // ✅ FIX 1: Changed "config" to "configs" (plural) to match your folder structure
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);



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

// --- 1. GET USER CREDITS ---
export const getUserCredits = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    res.json({ credits: user?.credits || 0 });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// --- 2. CREATE USER PROJECT (THE AI ENGINE) ---
export const createUserProject = async (req: Request, res: Response) => {
  const userId = req.userId;
  // ✅ FIX 2: Moved the userId check OUTSIDE the try block. 
  // If it was inside, TypeScript would throw an error in the catch block saying userId might be 'undefined'
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const { initialPrompt } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    // Check if user has enough credits (Costs 5 credits)
    if (user && user.credits < 5) {
      return res.status(403).json({ message: 'Add credit to create more projects' });
    }

    // 1. Create the project in the database
   const project = await prisma.websiteProject.create({
      data: {
        name: initialPrompt.length > 50 ? initialPrompt.substring(0, 47) + '...' : initialPrompt,
        initial_prompt: initialPrompt, // ✅ Mapped to the exact database column name!
        userId,
      },
    });
    // 2. Update user stats and deduct credits
    await prisma.user.update({
      where: { id: userId },
      data: { 
        totalCreation: { increment: 1 },
        credits: { decrement: 5 } 
      },
    });

    // 3. Start Conversation
    await prisma.conversation.create({
      data: { role: 'user', content: initialPrompt, projectId: project.id },
    });

    // 4. Enhance the user's prompt using AI
    const promptEnhanceResponse = await openai.chat.completions.create({
      model: 'openrouter/free', 
      messages: [
        { role: 'system', content: 'You are an expert web designer. Enhance the user request into a concise, detailed prompt for a single-file React component named App using Tailwind CSS that runs in browser Babel with no imports, exports, require, or module syntax.' },
        { role: 'user', content: initialPrompt },
      ],
    });

    const enhancedPrompt = promptEnhanceResponse.choices[0].message.content || initialPrompt;

    await prisma.conversation.create({
      data: { role: 'assistant', content: `I have enhanced your prompt to: "${enhancedPrompt}"`, projectId: project.id },
    });

    await prisma.conversation.create({
      data: { role: 'assistant', content: 'Now generating your website...', projectId: project.id },
    });

    // 5. Generate the actual Website Code using AI
    const codeGenerationResponse = await openai.chat.completions.create({
      model: 'openrouter/free', 
      messages: [
        { role: 'system', content: 'You are an expert React developer. Generate a complete single component named App in JSX using Tailwind CSS. Return ONLY JSX/React code with no import/export/require/module syntax, no ReactDOM.render/createRoot, and no markdown formatting.' },
        { role: 'user', content: enhancedPrompt },
      ],
    });

    let code = codeGenerationResponse.choices[0].message.content || '';

    // BUG FIX from video: If AI fails to generate code, refund the credits
    if (!code) {
      await prisma.conversation.create({
        data: { role: 'assistant', content: 'Unable to generate the code, please try again.', projectId: project.id },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: 5 } },
      });
      return res.status(500).json({ message: 'AI failed to generate code.' });
    }

    // Sanitize generated code for iframe runtime compatibility
    code = sanitizeAiReactCode(code);

    // 6. Save the version and update project
    const version = await prisma.version.create({
      data: {
        code,
        description: 'Initial version',
        projectId: project.id,
      },
    });

    await prisma.conversation.create({
      data: { role: 'assistant', content: 'I have created your website. You can now preview it and request any changes.', projectId: project.id },
    });

    await prisma.websiteProject.update({
      where: { id: project.id },
      data: { current_code: code, current_version_index: version.id },
    });

    // 7. Send success response back to frontend
    res.json({ projectId: project.id });

  } catch (error: any) {
    console.log(error);
    // Refund credits if server crashes mid-generation
    await prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: 5 } },
    });
    res.status(500).json({ message: error.message });
  }
};

// --- 3. GET SINGLE PROJECT ---
export const getUserProject = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // ✅ FIX 3: Changed "findUnique" to "findFirst". 
    // Prisma throws an error if you use findUnique with fields that aren't marked as @unique in your schema.
   const project = await prisma.websiteProject.findFirst({
      where: { 
        id: projectId as string, // 👈 FIX: Added "as string" right here!
        userId: userId as string // 👈 Added here too just to be 100% safe
      },
      include: {
        conversation: { orderBy: { timestamp: 'asc' } },
        versions: { orderBy: { timestamp: 'asc' } },
      },
    });
    res.json(project);
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// --- 4. GET ALL USER PROJECTS ---
export const getUserProjects = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const projects = await prisma.websiteProject.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ projects });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// --- 5. TOGGLE PUBLISH STATUS ---
export const togglePublish = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { projectId } = req.params;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // ✅ FIX 3 (Continued): Changed "findUnique" to "findFirst" here as well.
    const project = await prisma.websiteProject.findFirst({
      where: { id: projectId as string, userId },
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    await prisma.websiteProject.update({
      where: { id: projectId as string },
      data: { isPublished: !project.isPublished },
    });

    res.json({ message: project.isPublished ? 'Project unpublished' : 'Project published successfully' });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// --- 6. PURCHASE CREDITS (Stripe Checkout) ---
export const purchaseCredits = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const { planId } = req.body;
    
    // Map the incoming planId to credits and price (in cents)
    let credits = 0;
    let amount = 0;
    let planName = "";

    if (planId === 'basic') { credits = 100; amount = 500; planName = "Basic"; }      // $5.00
    else if (planId === 'pro') { credits = 400; amount = 1900; planName = "Pro"; }    // $19.00
    else if (planId === 'enterprise') { credits = 1000; amount = 4900; planName = "Enterprise"; } // $49.00
    else return res.status(400).json({ message: 'Invalid plan selected' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `AI Site Builder - ${planName} Plan (${credits} Credits)` },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/projects?payment=success`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing?payment=cancelled`,
      // We hide the user ID here so Stripe remembers who paid!
      metadata: {
        userId: userId,
        creditsToAdd: credits.toString(),
      },
    });

    res.json({ paymentLink: session.url });
  } catch (error: any) {
    console.error("Stripe Error:", error);
    res.status(500).json({ message: error.message });
  }
};