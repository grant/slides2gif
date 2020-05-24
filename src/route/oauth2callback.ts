import {Request, Response} from 'express';

/**
 * OAuth Callback
 */
export default (req: Request, res: Response) => {
  res.send('OAuth Callback');
};
