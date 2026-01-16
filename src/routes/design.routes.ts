import { Router, Request, Response } from 'express';
import * as designService from '../services/design.service';

const router = Router();

// ===================== VERSION CONTROL ROUTES =====================

/**
 * POST /api/versions - COMMIT: Create new version
 */
router.post('/versions', async (req: Request, res: Response) => {
  try {
    const { commitMessage, pngBase64, createdBy } = req.body;
    
    const version = await designService.createVersion({
      commitMessage,
      pngBase64,
      createdBy: createdBy || 'designer'
    });
    
    res.status(201).json(version);
  } catch (error: any) {
    console.error('Error creating version:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/versions/:versionNumber/png - Proxy PNG from S3
 * This bypasses CORS issues by serving the PNG through our backend
 */
router.get('/versions/:versionNumber/png', async (req: Request, res: Response) => {
  try {
    const versionNumber = parseInt(req.params.versionNumber);
    
    // Get version from database
    const version = await designService.getVersionByNumber(versionNumber);
    
    if (!version || !version.previewUrl) {
      return res.status(404).json({ error: 'Version or preview not found' });
    }

    // Fetch PNG from S3
    const s3Response = await fetch(version.previewUrl);
    
    if (!s3Response.ok) {
      return res.status(502).json({ error: 'Failed to fetch from S3' });
    }

    const pngBuffer = await s3Response.arrayBuffer();
    
    // Set proper headers and send PNG
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=31536000');
    res.send(Buffer.from(pngBuffer));
    
  } catch (error: any) {
    console.error('Error proxying PNG:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/versions - Get version history
 */
router.get('/versions', async (req: Request, res: Response) => {
  try {
    const versions = await designService.getVersionHistory();
    res.json(versions);
  } catch (error: any) {
    console.error('Error fetching versions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/versions/:id - Get specific version
 */
router.get('/versions/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const version = await designService.getVersionById(id);
    
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }
    
    res.json(version);
  } catch (error: any) {
    console.error('Error fetching version:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/versions/revert - REVERT: Restore a previous version
 */
router.post('/versions/revert', async (req: Request, res: Response) => {
  try {
    const { targetVersion } = req.body;
    
    if (!targetVersion) {
      return res.status(400).json({ error: 'targetVersion is required' });
    }
    
    const version = await designService.revertToVersion(targetVersion);
    res.status(201).json(version);
  } catch (error: any) {
    console.error('Error reverting version:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/versions/compare - DIFF: Compare two versions
 */
router.get('/versions/compare', async (req: Request, res: Response) => {
  try {
    const v1 = parseInt(req.query.v1 as string);
    const v2 = parseInt(req.query.v2 as string);
    
    if (!v1 || !v2) {
      return res.status(400).json({ error: 'v1 and v2 query parameters are required' });
    }
    
    const comparison = await designService.compareVersions(v1, v2);
    res.json(comparison);
  } catch (error: any) {
    console.error('Error comparing versions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/versions/:versionNumber - Delete a version and its S3 PNG
 */
router.delete('/versions/:versionNumber', async (req: Request, res: Response) => {
  try {
    const versionNumber = parseInt(req.params.versionNumber);
    
    if (isNaN(versionNumber)) {
      return res.status(400).json({ error: 'Invalid versionNumber' });
    }
    
    const success = await designService.deleteVersion(versionNumber);
    
    if (success) {
      res.json({ success: true, message: `Version ${versionNumber} deleted successfully` });
    } else {
      res.status(500).json({ error: 'Failed to delete version' });
    }
  } catch (error: any) {
    console.error('Error deleting version:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
