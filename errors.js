export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error instanceof HttpError ? error.status : 500;
  let message = status === 500 ? 'Internal Server Error' : error.message;
  if (error.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body'; }
  if (error.type === 'entity.too.large') { status = 413; message = 'Request body is too large'; }
  if (error.type === 'charset.unsupported' || error.type === 'encoding.unsupported') { status = 415; message = 'Unsupported body encoding'; }
  if (status === 500) console.error('Unhandled request error:', error.message);
  res.status(status).json({ error: message });
}
