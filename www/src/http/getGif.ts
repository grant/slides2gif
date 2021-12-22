import {Request, Response} from 'express';

/**
 * Gets a GIF URL.
 */
export default (req: Request, res: Response) => {
  res.send('Get GIF');
};
