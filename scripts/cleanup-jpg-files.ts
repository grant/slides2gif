/**
 * Cleanup script to remove all .jpg and .jpeg files from GCS bucket
 * Since we've switched to PNG format, we want to remove old JPG files
 * They will be regenerated as PNG when slides are accessed again
 * 
 * Usage:
 *   cd scripts && npm run cleanup-jpg
 *   cd scripts && npm run cleanup-jpg --yes
 *   just cleanup-jpg --yes
 */

import {Storage} from '@google-cloud/storage';

const BUCKET_NAME = process.env.GCS_CACHE_BUCKET || 'slides2gif-cache';

async function cleanupJpgFiles() {
  console.log(`Starting cleanup of JPG files from bucket: ${BUCKET_NAME}`);
  console.log('');

  try {
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);

    // Check if bucket exists
    const [exists] = await bucket.exists();
    if (!exists) {
      console.error(`Bucket ${BUCKET_NAME} does not exist.`);
      process.exit(1);
    }

    // List all files in the bucket
    console.log('Listing all files in bucket...');
    const [files] = await bucket.getFiles();
    console.log(`Found ${files.length} total files\n`);

    // Filter for JPG/JPEG files
    const jpgFiles = files.filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.jpg') || name.endsWith('.jpeg');
    });

    if (jpgFiles.length === 0) {
      console.log('No JPG/JPEG files found. Nothing to clean up.');
      return;
    }

    console.log(`Found ${jpgFiles.length} JPG/JPEG files to delete:\n`);
    jpgFiles.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name}`);
    });
    console.log('');

    // Ask for confirmation (in non-interactive mode, use --yes flag)
    const args = process.argv.slice(2);
    const skipConfirmation = args.includes('--yes') || args.includes('-y');

    if (!skipConfirmation) {
      console.log('⚠️  WARNING: This will permanently delete these files.');
      console.log('They will be regenerated as PNG when slides are accessed again.');
      console.log('');
      console.log('To proceed without confirmation, use: --yes or -y');
      console.log('');
      console.log('Press Ctrl+C to cancel, or wait 10 seconds to proceed...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }

    console.log('\nDeleting files...\n');

    let deleted = 0;
    let failed = 0;

    // Delete files in batches to avoid overwhelming the API
    const batchSize = 10;
    for (let i = 0; i < jpgFiles.length; i += batchSize) {
      const batch = jpgFiles.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async file => {
          try {
            await file.delete();
            console.log(`  ✓ Deleted: ${file.name}`);
            deleted++;
          } catch (error: any) {
            console.error(`  ✗ Failed to delete ${file.name}: ${error.message}`);
            failed++;
          }
        })
      );
    }

    console.log('');
    console.log('Cleanup complete!');
    console.log(`  Deleted: ${deleted} files`);
    if (failed > 0) {
      console.log(`  Failed: ${failed} files`);
    }
  } catch (error: any) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupJpgFiles().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
