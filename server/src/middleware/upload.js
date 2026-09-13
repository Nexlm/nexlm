import multer from 'multer';
import { MAX_UPLOAD_BYTES } from '../config/constants.js';

/** Keeps a single image in memory so it can be validated before being stored. */
export const singleImage = (field = 'image') =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  }).single(field);
