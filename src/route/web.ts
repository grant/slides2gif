import {Request, Response} from 'express';

/**
 * Global API endpoint.
 */
export default (req: Request, res: Response) => {
  res.send('Hello, World, this is Grant.');
};
