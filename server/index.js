/**
 * Entry point for Vercel's "Express" framework preset, which looks for
 * index.js at the project root. It delegates to the serverless handler so the
 * API deploys the same way whether the project uses the "Express" or "Other"
 * preset. The long-running server still starts from src/index.js.
 */
export { default } from './api/index.js';
