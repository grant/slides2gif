import { Storage, File } from "@google-cloud/storage";
// eslint-disable-next-line node/no-extraneous-import
import { Metadata } from "@google-cloud/common";
import mkdirp from "mkdirp";
import * as fs from "fs";

// Use the same bucket as the www service for cached slides
const BUCKET_NAME = process.env.GCS_CACHE_BUCKET || "slides2gif-cache";

/**
 * Options for downloading slides from GCS.
 */
export interface DownloadImagesRequestOptions {
  presentationId: string; // The presentation ID.
  slideList: string; // The slides query. i.e. "1,2,3" or "3,5,9"
  downloadLocation: string; // ?The local relative folder name for the downloads.
  thumbnailSize?: "SMALL" | "MEDIUM" | "LARGE"; // Thumbnail size to download
}

/**
 * Uploads a file to Cloud Storage
 * @param localFilepath The path to the local file
 * @param gcsFilename The name of the file in Cloud Storage, i.e. `myfile.gif`
 */
export async function uploadFile(localFilepath: string, gcsFilename: string) {
  const storage = new Storage();
  const [file]: [File, Metadata] = await storage
    .bucket(BUCKET_NAME)
    .upload(localFilepath, {
      destination: gcsFilename,
    });
  return file;
}

/**
 * Gets the Cloud Storage full URL from a file name.
 * @param gcsFilename The file
 * @returns The gs:// filename
 */
export function getGCSPath(gcsFilename: string) {
  return `gs://${BUCKET_NAME}/${gcsFilename}`;
}

/**
 * Downloads images from GCS.
 * @param downloadImagesReq The image download request.
 */
export async function downloadFiles({
  downloadLocation,
  presentationId,
  slideList,
  thumbnailSize = "MEDIUM",
}: DownloadImagesRequestOptions): Promise<
  { files: string[] } | { error: string }
> {
  console.log("DOWNLOADING FILES", {
    presentationId,
    slideList,
    thumbnailSize,
  });

  // Validate arguments
  if (!slideList) {
    return { error: "Missing argument: slideList" };
  }

  if (slideList === "") {
    return { error: "slideList cannot be empty" };
  }
  const storage = new Storage();

  // Files are stored at: presentations/{presentationId}/slides/{objectId}_{size}.jpg
  // All sizes now use a suffix: _small, _medium, or _large
  const sizeSuffix = `_${thumbnailSize.toLowerCase()}`;
  const prefix = `presentations/${presentationId}/slides/`;
  console.log(`Looking for files in bucket: ${BUCKET_NAME}, prefix: ${prefix}`);
  const [fileList] = await storage.bucket(BUCKET_NAME).getFiles({
    prefix: prefix,
  });
  console.log(
    `FOUND ${fileList.length} FILES with prefix ${prefix} in bucket ${BUCKET_NAME}.`,
  );

  // Debug: List all files found with their objectIds
  console.log("\n=== FILES FOUND IN GCS ===");
  fileList.forEach((file, index) => {
    const fileName = file.name.split("/").pop() || "";
    const objectId = fileName.replace(/\.(jpg|jpeg|png)$/i, "");
    console.log(`${index + 1}. ${file.name}`);
    console.log(`   objectId: ${objectId}`);
  });
  console.log("========================\n");

  // Generate GCS Console URL for debugging
  const gcsConsoleUrl =
    "https://console.cloud.google.com/storage/browser/" +
    BUCKET_NAME +
    "/" +
    encodeURIComponent(prefix);
  console.log("\nGCS Console URL to view files:");
  console.log(gcsConsoleUrl);
  console.log("");

  if (fileList.length === 0) {
    console.warn(
      `No files found! Check that bucket ${BUCKET_NAME} exists and contains files with prefix ${prefix}`,
    );
  }

  // Parse slideList (comma-separated list of objectIds)
  const slideIds =
    slideList === "*"
      ? null // Download all slides
      : slideList.split(",").map((id) => id.trim());

  console.log("\n=== FILTERING ===");
  console.log("slideList received:", slideList);
  console.log("Parsed slideIds:", slideIds);
  console.log("Total files to filter:", fileList.length);

  // Filter files by slideList if specified
  const filesToDownload = slideIds
    ? fileList.filter((file) => {
        // Extract objectId from path: presentations/{presentationId}/slides/{objectId}_{size}.jpg
        // All files now have a size suffix: _small, _medium, or _large
        const fileName = file.name.split("/").pop() || "";
        // Remove size suffix and extension to get objectId
        const objectId = fileName.replace(
          /_(small|medium|large)\.(jpg|jpeg|png)$/i,
          "",
        );
        const matches = slideIds.includes(objectId);

        // Check that the file matches the requested size (all files have suffixes now)
        const expectedSuffix = `_${thumbnailSize.toLowerCase()}.`;
        const hasCorrectSize = fileName.includes(expectedSuffix);

        const shouldDownload = matches && hasCorrectSize;

        // Log matching status
        if (shouldDownload) {
          console.log(
            "  [MATCHED]",
            file.name,
            "(objectId:",
            objectId + ", size:",
            thumbnailSize + ")",
          );
        } else {
          if (!matches) {
            console.log(
              "  [NOT MATCHED - wrong objectId]",
              file.name,
              "(objectId:",
              objectId + ")",
            );
          } else if (!hasCorrectSize) {
            console.log(
              "  [NOT MATCHED - wrong size]",
              file.name,
              "(objectId:",
              objectId + ", expected:",
              thumbnailSize + ")",
            );
          }
        }

        return shouldDownload;
      })
    : fileList;

  console.log("Files after filtering:", filesToDownload.length);
  console.log("==================\n");

  console.log(
    `DOWNLOADING ${filesToDownload.length} FILES (filtered from ${fileList.length}).`,
  );

  // Download filtered files
  const res: {
    files: string[];
  } = { files: [] };
  await mkdirp(`${downloadLocation}/${presentationId}`);

  for (let i = 0; i < filesToDownload.length; ++i) {
    const f = filesToDownload[i];
    try {
      // Preserve directory structure: downloads/{presentationId}/presentations/{presentationId}/slides/{objectId}.jpg
      const destination = `${downloadLocation}/${f.name}`;
      console.log(`- Downloading ${f.name} to ${destination}`);

      // Ensure directory exists
      const dirPath = destination.substring(0, destination.lastIndexOf("/"));
      await mkdirp(dirPath);

      // Download file with error handling
      // Use a promise wrapper to handle the stream properly
      await new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(destination);
        const readStream = f.createReadStream();

        readStream.on("error", (err: Error) => {
          writeStream.destroy();
          reject(err);
        });

        writeStream.on("error", (err: Error) => {
          readStream.destroy();
          reject(err);
        });

        writeStream.on("finish", () => {
          resolve();
        });

        readStream.pipe(writeStream);
      });

      console.log(`  ✓ Successfully downloaded ${f.name}`);
      res.files.push(destination);
    } catch (error: any) {
      console.error(`  ✗ Error downloading ${f.name}:`, error);
      // Continue with other files even if one fails
      throw new Error(`Failed to download ${f.name}: ${error.message}`);
    }
  }
  return res;
}
