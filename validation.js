import { HttpError } from './errors.js';

export const MAX_LENGTH = 140;
export function parseId(value) {
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new HttpError(400, 'Task ID must be a positive integer');
  return Number(value);
}

export function validateBody(body, creating = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Body must be a JSON object');
  const allowed = creating ? ['text'] : ['text', 'completed'];
  if (Object.keys(body).some(key => !allowed.includes(key))) throw new HttpError(400, `Allowed fields: ${allowed.join(', ')}`);
  if (!Object.keys(body).length) throw new HttpError(400, creating ? 'Task text is required' : 'Provide text or completed');
  const result = {};
  if (creating || Object.hasOwn(body, 'text')) {
    if (typeof body.text !== 'string' || !body.text.trim()) throw new HttpError(400, 'Task text is required');
    const text = body.text.trim().normalize('NFC');
    if (text.length > MAX_LENGTH) throw new HttpError(400, `Task text must be at most ${MAX_LENGTH} characters`);
    if (/[\u0000-\u001F\u007F]/u.test(text)) throw new HttpError(400, 'Task text cannot contain control characters');
    result.text = text;
  }
  if (Object.hasOwn(body, 'completed')) {
    if (typeof body.completed !== 'boolean') throw new HttpError(400, 'completed must be a boolean');
    result.completed = body.completed;
  }
  return result;
}
