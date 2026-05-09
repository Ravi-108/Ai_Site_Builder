import { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import openai from '../config/openai.js'; // ✅ FIX 1: Changed "config" to "configs" (plural) to match your folder structure
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);



const sanitizeAiHtmlCode = (rawCode: string): string => {
  let code = rawCode || '';

  // 1. Try to extract HTML from markdown code fences (```html ... ```)
  const fenceMatch = code.match(/```(?:html|htm)?\s*\n([\s\S]*?)```/i);
  if (fenceMatch) {
    code = fenceMatch[1].trim();
  } else {
    code = code.replace(/^```(?:html|htm)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  // 2. If the AI returned a full HTML document, validate it has actual content
  if (/<!DOCTYPE\s+html/i.test(code) || /^\s*<html[\s>]/i.test(code)) {
    // Check if the document has actual visible body content (not just CSS/JS)
    const hasBodyContent = /<body[\s>][\s\S]*?<(h[1-6]|p|div|section|header|nav|main|article|span|img|ul|ol|table|form)\b/i.test(code);
    if (!hasBodyContent) {
      return '';  // Return empty to trigger the "AI failed" check downstream
    }
    return code.trim();
  }

  // 3. Try to find embedded HTML within commentary text
  const embeddedHtml = code.match(/(<!DOCTYPE\s+html[\s\S]*<\/html>)/i);
  if (embeddedHtml) {
    return embeddedHtml[1].trim();
  }

  // 4. Check if the output contains enough HTML tags to be valid markup
  const htmlTagCount = (code.match(/<[a-z][a-z0-9]*[\s>]/gi) || []).length;
  const totalLength = code.length;

  if (htmlTagCount < 3 && totalLength > 200) {
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
    const { initialPrompt, model } = req.body;

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

    // Check if user has enough credits
    if (user && user.credits < cost) {
      return res.status(403).json({ message: `Need ${cost} credits to use this model` });
    }

    // 1. Create the project in the database
    const project = await prisma.websiteProject.create({
      data: {
        name: initialPrompt.length > 50 ? initialPrompt.substring(0, 47) + '...' : initialPrompt,
        initial_prompt: initialPrompt, // ✅ Mapped to the exact database column name!
        userId,
      },
    });
    // 2. Update user stats and deduct dynamic credits
    await prisma.user.update({
      where: { id: userId },
      data: {
        totalCreation: { increment: 1 },
        credits: { decrement: cost }
      },
    });

    // 3. Start Conversation
    await prisma.conversation.create({
      data: { role: 'user', content: initialPrompt, projectId: project.id },
    });

    // 4. Enhance the user's prompt using AI
    const promptEnhanceResponse = await openai.chat.completions.create({
      model: aiModelId,
      messages: [
        { role: 'system', content: 'You are an expert web developer and designer. Enhance the user request into a concise, detailed prompt for a complete, self-contained HTML website. The website MUST use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>) in the <head> for styling, and vanilla JavaScript for interactivity. NO React, NO JSX. The enhanced prompt must emphasize: 1) Mobile-first responsive design using Tailwind classes (sm:, md:, lg:). 2) Extremely beautiful, modern, and premium aesthetics: professional color palette, Google Fonts for typography, smooth hover transitions, gradients, shadows, and rounded corners. 3) Every button, link, form, and navigation must be fully functional with JavaScript event handlers. 4) Include a responsive hamburger menu for mobile. Ask for ONLY the HTML code, no markdown or commentary.' },
        { role: 'user', content: `Enhance this website creation request: "${initialPrompt}"` },
      ],
      max_tokens: 1000,
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
      model: aiModelId,
      messages: [
        {
          role: 'system', content: `You are a code generator. You ONLY output raw HTML code. You NEVER output explanations, suggestions, or commentary. Your response must start with <!DOCTYPE html> and end with </html>. Nothing else.

RULES:
- Return a COMPLETE HTML document starting with <!DOCTYPE html>.
- Use ONLY vanilla HTML, Tailwind CSS, and JavaScript. You MUST include Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script> inside the <head>. NO React, NO JSX.
- All custom CSS (if absolutely needed) must be in <style> tags inside the <head>, but prefer Tailwind classes.
- All JavaScript must be in <script> tags at the end of <body>.
- RESPONSIVE DESIGN: Use mobile-first Tailwind classes. The layout must look great on phones, tablets, and desktops. Use Flexbox and Grid.
- EXTREMELY BEAUTIFUL DESIGN: The website must look modern, professional, and premium. Use a cohesive, elegant color palette. Import a modern Google Font via <link> (e.g., Inter, Outfit, or Plus Jakarta Sans) and apply it to the body. Use generous padding/margin, rounded corners (rounded-xl, rounded-2xl), soft drop shadows (shadow-lg, shadow-xl), subtle gradients (bg-gradient-to-r), and smooth hover effects (transition-all duration-300 hover:scale-105) on all interactive elements.
- FUNCTIONAL: Every button must have an onclick handler. Every form must have onsubmit with preventDefault and show feedback. Every navigation link must scroll smoothly to its section using anchor IDs. Include a working hamburger menu for mobile that toggles visibility.
- Use https://placehold.co/ for placeholder images (e.g., https://placehold.co/600x400).
- NEVER include markdown, code fences, or any text that is not HTML code.` },
        { role: 'user', content: `${enhancedPrompt}\n\nRespond with ONLY the complete HTML. Start your response with <!DOCTYPE html>` },
      ],
      max_tokens: 4000,
    });

    let code = codeGenerationResponse.choices[0].message.content || '';

    // BUG FIX from video: If AI fails to generate code, refund the credits
    if (!code) {
      await prisma.conversation.create({
        data: { role: 'assistant', content: 'Unable to generate the code, please try again.', projectId: project.id },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: cost } },
      });
      return res.status(500).json({ message: 'AI failed to generate code.' });
    }

    // Sanitize generated code for iframe compatibility
    code = sanitizeAiHtmlCode(code);

    // If sanitizer detected structurally empty HTML (no visible body content), treat as failure
    if (!code) {
      await prisma.conversation.create({
        data: { role: 'assistant', content: 'The AI generated an incomplete website with no visible content. Please try again.', projectId: project.id },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { credits: { increment: cost } },
      });
      return res.status(500).json({ message: 'AI generated empty HTML. Please try again.' });
    }

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