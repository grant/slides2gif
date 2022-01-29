import {withIronSessionApiRoute} from 'iron-session/next';
import {sessionOptions} from 'lib/session';
import {NextApiRequest, NextApiResponse} from 'next';

export default withIronSessionApiRoute(userRoute, sessionOptions);

async function userRoute(req: NextApiRequest, res: NextApiResponse) {
  // console.log('req.session');
  // console.log(req.session);
  if (req.session.user) {
    req.session.count = req.session.count ? +req.session.count + 1 : 1;
    await req.session.save();

    // in a real world application you might read the user id from the session and then do a database request
    // to get more information on the user if needed
    res.json({
      ...req.session.user,
      count: req.session.count,
      isLoggedIn: true,
    });
  } else {
    res.json({
      isLoggedIn: false,
    });
  }
}
