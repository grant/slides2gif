export {};

// import {google} from 'googleapis';
// import {driveactivity_v2} from 'googleapis/build/src/apis/driveactivity/v2';
// import {OAuth2Client} from 'google-auth-library';

// const MIME_GOOGLE_SLIDES = 'application/vnd.google-apps.presentation';

// /**
//  * A Google Drive Activity client.
//  */
// export class DriveActivity {
//   #driveactivity: driveactivity_v2.Driveactivity;

//   /**
//    * Creates a Slides client.
//    * @param {OAuth2Client} auth The auth client for this library.
//    */
//   constructor(auth: OAuth2Client) {
//     this.#driveactivity = google.driveactivity({
//       version: 'v2',
//       auth,
//     }) as driveactivity_v2.Driveactivity;
//   }

//   /**
//    * Gets the Drive IDs of recently modified presentations.
//    */
//   async getRecentPresentations() {
//     // Get Drive activity within the last week.
//     // https://developers.google.com/drive/activity/v2/reference/rest/v2/activity/query
//     const minimumDate = +new Date().setDate(new Date().getDate() - 7);
//     const activity = await this.#driveactivity.activity.query({
//       requestBody: {
//         pageSize: 200,
//         filter: `time > ${minimumDate} AND detail.action_detail_case:(CREATE EDIT)`,
//       },
//     });

//     // Filter all Drive activity to only Slides activities.
//     const activities = activity.data.activities || [];
//     const slidesActivities = activities.filter(activity => {
//       const target = activity.targets && activity.targets[0];
//       if (!target) return false;
//       return target.driveItem?.mimeType === MIME_GOOGLE_SLIDES;
//     });

//     // Map Slides activities to Drive IDs.
//     const ids = slidesActivities.map(slideActivity => {
//       const target = slideActivity.targets && slideActivity.targets[0];
//       if (!target) return '';
//       // Remove 'items/' prefix from ID.
//       return (target.driveItem?.name || '').split('items/')[1];
//     });
//     const nonNullIds = ids.filter(id => !!id);

//     // Remove duplicate IDs.
//     const uniqueIds = [...new Set(nonNullIds)];
//     return uniqueIds;
//   }
// }
