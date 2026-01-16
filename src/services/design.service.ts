import { prisma } from '../lib/prisma';

/**
 * Design Service - Version Control System
 * Provides Git-like version control for designer workflows
 */

// ===================== VERSION CONTROL (GIT-LIKE) =====================

interface CreateVersionData {
  commitMessage?: string;
  pngBase64?: string;
  createdBy?: string;
}

/**
 * COMMIT: Create a new version (like git commit)
 * Uploads PNG blob to S3 and saves version
 */
export const createVersion = async (data: CreateVersionData) => {
  // Get the latest version number
  const latestVersion = await prisma.designVersion.findFirst({
    orderBy: { versionNumber: 'desc' },
    take: 1
  });

  // Auto-increment version number
  const nextVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

  console.log(`📸 Processing PNG for V${nextVersionNumber}...`);
  
  let previewUrl: string | undefined = undefined;
  
  // Upload PNG if base64 is provided
  if (data.pngBase64) {
    try {
      console.log('☁️ Uploading PNG to S3...');
      
      // Upload base64 PNG to S3
      const { uploadBase64PNG } = await import('./s3Upload.service');
      const uploadResult = await uploadBase64PNG(data.pngBase64, nextVersionNumber, nextVersionNumber);
      
      if (uploadResult.success && uploadResult.url) {
        previewUrl = uploadResult.url;
        console.log(`✅ Uploaded to S3: ${previewUrl}`);
      } else {
        console.error('❌ S3 upload failed:', uploadResult.error);
      }
      
    } catch (error) {
      console.error('❌ PNG upload failed:', error);
      // Continue without preview URL - don't fail the version creation
    }
  }

  // Create new version
  const version = await prisma.designVersion.create({
    data: {
      versionNumber: nextVersionNumber,
      commitMessage: data.commitMessage || `Version ${nextVersionNumber}`,
      previewUrl: previewUrl,
      createdBy: data.createdBy || 'designer'
    }
  });

  console.log(`✅ Version ${nextVersionNumber} created with preview URL`);

  return version;
};

/**
 * GET VERSION HISTORY: List all versions (like git log)
 */
export const getVersionHistory = async () => {
  return await prisma.designVersion.findMany({
    orderBy: { versionNumber: 'desc' }
  });
};

/**
 * GET SPECIFIC VERSION: Get a specific version details
 */
export const getVersionById = async (versionId: number) => {
  return await prisma.designVersion.findUnique({
    where: { id: versionId }
  });
};

/**
 * GET VERSION BY NUMBER: Get version by version number
 */
export const getVersionByNumber = async (versionNumber: number) => {
  return await prisma.designVersion.findFirst({
    where: {
      versionNumber
    }
  });
};

/**
 * REVERT: Restore a previous version (like git revert)
 * Creates a new version that is a copy of the target version
 */
export const revertToVersion = async (targetVersionNumber: number) => {
  // Get the target version to restore
  const targetVersion = await prisma.designVersion.findFirst({
    where: {
      versionNumber: targetVersionNumber
    }
  });

  if (!targetVersion) {
    throw new Error(`Version ${targetVersionNumber} not found`);
  }

  // Note: This will create a new version without PNG since we can't regenerate it
  // The previewUrl will be null for reverted versions
  const newVersion = await createVersion({
    commitMessage: `Reverted to V${targetVersionNumber}`,
    createdBy: 'designer'
  });

  return newVersion;
};

/**
 * DIFF: Compare two versions
 */
export const compareVersions = async (version1: number, version2: number) => {
  const v1 = await prisma.designVersion.findFirst({
    where: { versionNumber: version1 }
  });

  const v2 = await prisma.designVersion.findFirst({
    where: { versionNumber: version2 }
  });

  if (!v1 || !v2) {
    throw new Error('One or both versions not found');
  }

  return {
    version1: v1,
    version2: v2,
    changes: {
      previewUrlChanged: v1.previewUrl !== v2.previewUrl,
      commitMessageChanged: v1.commitMessage !== v2.commitMessage
    }
  };
};

/**
 * DELETE VERSION: Delete a version and its PNG from S3
 * @param versionNumber - Version number to delete
 * @returns Success status
 */
export const deleteVersion = async (versionNumber: number): Promise<boolean> => {
  try {
    // Find the version
    const version = await prisma.designVersion.findFirst({
      where: {
        versionNumber
      }
    });

    if (!version) {
      throw new Error(`Version ${versionNumber} not found`);
    }

    console.log(`🗑️ Deleting version ${versionNumber}...`);

    // Delete PNG from S3 if it exists
    if (version.previewUrl) {
      console.log(`🗑️ Deleting PNG from S3: ${version.previewUrl}`);
      const { deleteS3Object } = await import('./s3Upload.service');
      const deleted = await deleteS3Object(version.previewUrl);
      
      if (!deleted) {
        console.warn('⚠️ Failed to delete PNG from S3, but continuing with database deletion');
      }
    }

    // Delete version from database
    await prisma.designVersion.delete({
      where: { id: version.id }
    });

    console.log(`✅ Version ${versionNumber} deleted successfully`);

    // Update remaining version numbers to maintain sequence
    const remainingVersions = await prisma.designVersion.findMany({
      where: {
        versionNumber: { gt: versionNumber }
      },
      orderBy: { versionNumber: 'asc' }
    });

    // Renumber subsequent versions
    for (const v of remainingVersions) {
      await prisma.designVersion.update({
        where: { id: v.id },
        data: { versionNumber: v.versionNumber - 1 }
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to delete version:', error);
    throw error;
  }
};
