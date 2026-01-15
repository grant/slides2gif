import {withIronSessionApiRoute} from 'iron-session/next';
import { GoogleOAuthData } from 'lib/oauth';
import {sessionOptions} from 'lib/session';
import {NextApiRequest, NextApiResponse} from 'next';
import { APIResUser } from 'types/user';


async function userRoute(req: NextApiRequest, res: NextApiResponse) {
  let resObject: APIResUser;
  if (req.session.googleOAuth) {
    req.session.count = req.session.count ? +req.session.count + 1 : 1;
    await req.session.save();

    // in a real world application you might read the user id from the session and then do a database request
    // to get more information on the user if needed
    resObject = {
      auth: req.session.googleOAuth,
      count: req.session.count,
      isLoggedIn: true,
    };
  } else {
    resObject = {
      isLoggedIn: false,
    }
  }
  res.json(resObject);
}

export default withIronSessionApiRoute(userRoute, sessionOptions);