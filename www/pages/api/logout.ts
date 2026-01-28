import {NextApiRequest, NextApiResponse} from 'next';
import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from '../../lib/session';

async function logoutHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({error: 'Method not allowed'});
  }

  try {
    req.session.destroy();
    return res.status(200).json({success: true});
  } catch (error: any) {
    console.error('Logout error:', error);
    return res.status(500).json({error: 'Failed to logout'});
  }
}

export default withIronSessionApiRoute(logoutHandler as any, sessionOptions);
