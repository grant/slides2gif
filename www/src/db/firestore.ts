// import {Credentials} from 'googleapis/node_modules/google-auth-library/build/src/auth/credentials';
// const {Firestore} = require('@google-cloud/firestore');
// const {FirestoreStore} = require('@google-cloud/connect-firestore');

/**
 * Firestore Database.
 *
 * Stores permanent information.
 *
 * Collections:
 * - credentials: User Google OAuth credentials.
 * - express-sessions: Browser sessions.
 * - gifs: Metadata around GIFs
 *
 * See the UI:
 * @see https://console.cloud.google.com/firestore/data/
 */

/**
 * Setup local db configuration
 */
// import * as admin from 'firebase-admin';
// admin.initializeApp({
//   credential: admin.credential.applicationDefault(), // uses GOOGLE_APPLICATION_CREDENTIALS
// });
// const db = admin.firestore();

// const COLLECTION = {
//   CREDENTIALS: 'credentials',
//   EXPRESS_SESSIONS: 'express-sessions',
// };

// /**
//  * Database methods.
//  */
// export default class DB {
//   /**
//    * Saves user info to the db.
//    * @param {string} userinfo.userId The unique User ID.
//    * @param {object} userinfo.credentials The user's credentials.
//    */
//   static async saveUserInfo(userinfo: {
//     userID: string;
//     credentials: Credentials;
//   }) {
//     if (!userinfo.userID.length) throw new Error('Invalid userid');
//     if (!userinfo.credentials) throw new Error('Invalid creds');
//     const docRef = db.collection(COLLECTION.CREDENTIALS).doc(userinfo.userID);
//     docRef.set(userinfo.credentials);
//     console.log(`Saved auth info for: ${userinfo.userID}`);
//   }

//   /**
//    * Gets user info.
//    * @param {string} userid The Google User ID.
//    */
//   static async getUserInfo(userid: string) {
//     if (!userid.length) throw new Error('Invalid userid');
//     return db.collection(COLLECTION.CREDENTIALS).doc(userid).get();
//   }

//   /**
//    * List all credentials.
//    */
//   static async getCredentialsList() {
//     const allCreds = await db.collection(COLLECTION.CREDENTIALS).select().get();
//     return allCreds.docs.map(doc => doc.id);
//   }

//   /**
//    * Prints a summary of the database.
//    */
//   static async printSummary() {
//     try {
//       // const collections = await db.listCollections();
//       // console.log('--- START');
//       // console.log('# Collections:');
//       // for (const collection of collections) {
//       //   const size = (await db.collection(collection.id).select().get()).size;
//       //   console.log(`- ${collection.id} (${size})`);
//       // }
//       // console.log('--- END');
//     } catch (e) {
//       console.error(e);
//     }
//   }
// }

// /**
//  * Gets configuration for a Firestore session.
//  */
// export const getFirestoreSession = () => {
//   return {
//     store: new FirestoreStore({
//       dataset: new Firestore(),
//       kind: COLLECTION.EXPRESS_SESSIONS,
//     }),
//     secret: 'my-secret',
//     resave: false,
//     saveUninitialized: true,
//   };
// };
