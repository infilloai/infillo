import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger';

const router = Router();

// Get all .rest files
router.get('/files', async (_req: Request, res: Response) => {
  try {
    // Use process.cwd() which is more reliable than __dirname for finding project root
    const projectRoot = process.cwd();
    const restDir = projectRoot.includes('apps/backend') 
      ? path.join(projectRoot, 'rest')  // Running from backend directory
      : path.join(projectRoot, 'apps/backend/rest');  // Running from project root
    
    logger.info(`Looking for REST files in: ${restDir}`);
    
    if (!fs.existsSync(restDir)) {
      res.status(404).json({
        success: false,
        message: `REST files directory not found at: ${restDir}`
      });
      return;
    }

    const files = fs.readdirSync(restDir)
      .filter(file => file.endsWith('.rest'))
      .map(filename => {
        const filePath = path.join(restDir, filename);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        return {
          name: filename.replace('.rest', ''),
          filename,
          content,
          size: content.length,
          modified: fs.statSync(filePath).mtime
        };
      });

    res.json({
      success: true,
      data: files
    });
  } catch (error) {
    logger.error('Error reading REST files:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to read REST files'
    });
  }
});

// Get specific .rest file
router.get('/files/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    // Use process.cwd() which is more reliable than __dirname for finding project root
    const projectRoot = process.cwd();
    const restDir = projectRoot.includes('apps/backend') 
      ? path.join(projectRoot, 'rest')  // Running from backend directory
      : path.join(projectRoot, 'apps/backend/rest');  // Running from project root
    const filePath = path.join(restDir, `${filename}.rest`);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: 'REST file not found'
      });
      return;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const stats = fs.statSync(filePath);

    res.json({
      success: true,
      data: {
        name: filename,
        filename: `${filename}.rest`,
        content,
        size: content.length,
        modified: stats.mtime
      }
    });
  } catch (error) {
    logger.error('Error reading REST file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to read REST file'
    });
  }
});

export default router; 