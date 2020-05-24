import {Request, Response} from 'express';

/**
 * Creates and stores a GIF.
 */
export default (req: Request, res: Response) => {
  res.send('Create and store GIF');
};
