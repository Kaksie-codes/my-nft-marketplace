import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const color =
      res.statusCode >= 500 ? '\x1b[31m' : // red
      res.statusCode >= 400 ? '\x1b[33m' : // yellow
      res.statusCode >= 200 ? '\x1b[32m' : // green
      '\x1b[0m';                            // reset

    console.log(
      `${color}${req.method}\x1b[0m ${req.originalUrl} ${color}${res.statusCode}\x1b[0m - ${duration}ms`
    );
  });

  next();
}