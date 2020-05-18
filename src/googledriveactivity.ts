import {google} from 'googleapis';
import {driveactivity_v2} from 'googleapis/build/src/apis/driveactivity/v2';
import {getAuthClientWithCreds} from './auth';

let driveactivityClient: driveactivity_v2.Driveactivity | null = null;

const MIME_GOOGLE_SLIDES = 'application/vnd.google-apps.presentation';

const getDriveActivityClient = async () => {
  if (driveactivityClient) return driveactivityClient;

  // Create and memoize client
  const driveactivity = google.driveactivity({
    version: 'v2',
    auth: await getAuthClientWithCreds(),
  }) as driveactivity_v2.Driveactivity;
  driveactivityClient = driveactivity;

  return driveactivity;
};

/**
 * Gets the Drive IDs of recently modified presentations.
 */
export const getRecentPresentations: () => Promise<string[]> = async () => {
  // Get Drive activity within the last week.
  // https://developers.google.com/drive/activity/v2/reference/rest/v2/activity/query
  const driveactivity = await getDriveActivityClient();
  const minimumDate = +new Date().setDate(new Date().getDate() - 7);
  console.log(minimumDate);

  const activity = await driveactivity.activity.query({
    requestBody: {
      pageSize: 200,
      filter: `time > ${minimumDate} AND detail.action_detail_case:(CREATE EDIT)`,
    },
  });

  // Filter all Drive activity to only Slides activities.
  const activities = activity.data.activities || [];
  const slidesActivities = activities.filter(activity => {
    const target = activity.targets && activity.targets[0];
    if (!target) return false;
    return target.driveItem?.mimeType === MIME_GOOGLE_SLIDES;
  });

  // Map Slides activities to Drive IDs.
  const ids = slidesActivities.map(slideActivity => {
    const target = slideActivity.targets && slideActivity.targets[0];
    if (!target) return '';
    // Remove 'items/' prefix from ID.
    return (target.driveItem?.name || '').split('items/')[1];
  });
  const nonNullIds = ids.filter(id => !!id);

  // Remove duplicate IDs.
  const uniqueIds = [...new Set(nonNullIds)];
  return uniqueIds;
};
