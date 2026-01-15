import express, { Request, Response } from "express";
import { createGif, CreateGIFRequestOptions } from "./gif";
import {
  uploadFile,
  downloadFiles,
  getGCSPath,
  DownloadImagesRequestOptions,
} from "./storage";
import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";

const GIF_DOWNLOAD_LOCATION = "downloads";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Authentication middleware for Cloud Run
const authenticateRequest = async (
  req: Request,
  res: Response,
  next: express.NextFunction,
): Promise<void> => {
  // In local development, skip authentication
  // Check if we're NOT in production OR if GOOGLE_CLOUD_PROJECT is not set
  const nodeEnv = process.env.NODE_ENV || "";
  const hasGoogleCloudProject = !!process.env.GOOGLE_CLOUD_PROJECT;
  const isLocalDev = nodeEnv !== "production" || !hasGoogleCloudProject;

  console.log(
    `Auth check: NODE_ENV=${nodeEnv}, GOOGLE_CLOUD_PROJECT=${hasGoogleCloudProject}, isLocalDev=${isLocalDev}`,
  );

  if (isLocalDev) {
    console.log("Skipping authentication (local development)");
    return next();
  }

  // In Cloud Run, verify the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.error("Missing or invalid authorization header");
    res
      .status(401)
      .json({ error: "Unauthorized: Missing or invalid authorization header" });
    return;
  }

  // For Cloud Run, we trust the ID token from the service account
  // In a production setup, you might want to verify the token here
  // For now, we'll just check that it exists
  const token = authHeader.substring(7);
  if (!token) {
    console.error("Invalid token (empty)");
    res.status(401).json({ error: "Unauthorized: Invalid token" });
    return;
  }

  console.log("Authentication successful (Cloud Run)");
  next();
};

/**
 * Health check endpoint
 */
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

/**
 * Creates a gif given a folder of images in GCS.
 * URL parameters:
 * - presentationId: The Google Slide presentation
 * - slideList?: A comma delimited list of slides. i.e. "001,002"
 * - delay?: The GIF delay
 * - quality?: The GIF quality
 * - repeat?: The GIF repeat
 */
app.get(
  "/createGif",
  authenticateRequest,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const localFilename = `${uuidv4()}.gif`;
      const tempGCSFilename = localFilename;
      const presentationId = req.query.presentationId as string;

      if (!presentationId || presentationId === "") {
        res.status(400).json({
          result: "FAILURE",
          error: 'Query param "presentationId" is required.',
        });
        return;
      }

      // Get thumbnail size (default to MEDIUM if not specified)
      const thumbnailSize = ((req.query.thumbnailSize as string) ||
        "MEDIUM") as "SMALL" | "MEDIUM" | "LARGE";

      // Download images
      const downloadImagesReq: DownloadImagesRequestOptions = {
        presentationId: presentationId,
        slideList: (req.query.slideList as string) || "*",
        downloadLocation: GIF_DOWNLOAD_LOCATION,
        thumbnailSize: thumbnailSize as "SMALL" | "MEDIUM" | "LARGE",
      };
      await downloadFiles(downloadImagesReq);

      // Configuration options if defined.
      // Files are stored as .jpg in GCS at: presentations/{presentationId}/slides/{objectId}.jpg (SMALL)
      // or: presentations/{presentationId}/slides/{objectId}_{size}.jpg (MEDIUM/LARGE)
      // After download, they're at: downloads/presentations/{presentationId}/slides/{objectId}.jpg
      // Build glob pattern to match only the requested size
      // All sizes now use a suffix: _small, _medium, or _large
      const sizeSuffix = `_${thumbnailSize.toLowerCase()}`;
      const globPattern = `${GIF_DOWNLOAD_LOCATION}/presentations/${presentationId}/slides/*${sizeSuffix}.{jpg,jpeg,png}`;

      const gifReq: CreateGIFRequestOptions = {
        inputFrameGlobString: globPattern,
        outputGifFilename: localFilename,
        gifOptions: {},
        thumbnailSize: thumbnailSize, // Pass size for filtering
      };

      // Parse and set GIF options
      if (req.query.delay !== undefined) {
        gifReq.gifOptions.delay = +req.query.delay;
      }
      if (req.query.quality !== undefined) {
        gifReq.gifOptions.quality = +req.query.quality;
      }
      if (req.query.repeat !== undefined) {
        gifReq.gifOptions.repeat = +req.query.repeat;
      }

      console.log("GIF Request Options:", {
        thumbnailSize,
        globPattern: gifReq.inputFrameGlobString,
        gifOptions: gifReq.gifOptions,
        delay: req.query.delay,
        quality: req.query.quality,
        repeat: req.query.repeat,
      });
      await createGif(gifReq);

      // Upload GIF to GCS.
      const gcsPath = getGCSPath(localFilename);
      if (fs.existsSync(localFilename)) {
        console.log("Created gif locally!");

        // Upload then delete file
        await uploadFile(localFilename, tempGCSFilename);
        // Use unlinkSync for Node 16 compatibility
        if (fs.existsSync(localFilename)) {
          fs.unlinkSync(localFilename);
        }

        console.log(`Uploaded: ${gcsPath}`);
        res.json({
          result: "SUCCESS",
          file: gcsPath,
        });
        return;
      } else {
        console.log("error: gif does not exist");
        res.status(500).json({
          result: "FAILURE",
          file: gcsPath,
          error: "GIF file was not created",
        });
        return;
      }
    } catch (error: any) {
      console.error("Error creating GIF:", error);
      res.status(500).json({
        result: "FAILURE",
        error: error.message || "Internal server error",
      });
      return;
    }
  },
);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
