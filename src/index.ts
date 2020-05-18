import {Request, Response} from 'express';

/**
 * Global API endpoint.
 */
exports.serve = (req: Request, res: Response) => {
  res.send('sdf, World');
};
