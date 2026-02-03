import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from '../../lib/session';

async function logoutHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  try {
    // Explicitly clear all session data
    req.session.user = undefined;
    req.session.isLoggedIn = false;
    req.session.googleUserId = undefined;
    req.session.googleOAuth = undefined;
    req.session.googleTokens = undefined;

    // Save the cleared session to persist the logout
    await req.session.save();

    return res.status(200).json({success: true});
  } catch (error: any) {
    console.error('Logout error:', error);
    return res.status(500).json({error: 'Failed to logout'});
  }
}

export default withIronSessionApiRoute(logoutHandler as any, sessionOptions);
