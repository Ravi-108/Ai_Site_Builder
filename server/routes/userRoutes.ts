import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getUserCredits,
  createUserProject,
  getUserProject,
  getUserProjects,
  togglePublish,
  purchaseCredits
} from '../controllers/userController.js';

const userRouter = express.Router();

// Get the logged-in user's available credits
userRouter.get('/credits', protect, getUserCredits);

// Send a prompt to the AI and generate a new website
userRouter.post('/project', protect, createUserProject);

// Get all details for a single specific project
userRouter.get('/project/:projectId', protect, getUserProject);

// Get a list of all projects the user has created
userRouter.get('/projects', protect, getUserProjects);

// Toggle a project between public and private
userRouter.get('/publish-toggle/:projectId', protect, togglePublish);

// Buy more credits via Stripe (We will finish this later!)
userRouter.post('/purchase-credits', protect, purchaseCredits);

export default userRouter;