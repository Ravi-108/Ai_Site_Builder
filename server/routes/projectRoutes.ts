import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  makeRevision,
  rollbackToVersion,
  deleteProject,
  getProjectPreview,
  getPublishedProjects,
  getProjectById,
  saveProjectCode
} from '../controllers/projectController.js';

const projectRouter = express.Router();

// Ask the AI to make a revision to the code
projectRouter.post('/revision/:projectId', protect, makeRevision);

// Manually save edits made in the code editor
projectRouter.put('/save/:projectId', protect, saveProjectCode);

// Roll the code back to an older version
projectRouter.get('/rollback/:projectId/:versionId', protect, rollbackToVersion);

// Delete the project
projectRouter.delete('/:projectId', protect, deleteProject);

// Fetch the code strictly for the preview iframe
projectRouter.get('/preview/:projectId', protect, getProjectPreview);

// --- PUBLIC ROUTES (No 'protect' middleware needed) ---

// Fetch all published projects for the Community Page
projectRouter.get('/published', getPublishedProjects);

// Fetch a single published project for the Public View Page
projectRouter.get('/published/:projectId', getProjectById);

export default projectRouter;