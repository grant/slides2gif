import {Request, Response} from 'express';

/**
 * Global API endpoint.
 */
exports.function = (req: Request, res: Response) => {
  res.send('Hello, World, this is Grant.');
};
