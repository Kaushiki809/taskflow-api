import { Router } from 'express';
import { taskController } from './task-controller.js';
import { HttpError } from './errors.js';

export function taskRouter(store) {
  const router = Router();
  const controller = taskController(store);
  router.use((req, res, next) => {
    if (['POST', 'PUT'].includes(req.method) && !req.is('application/json')) return next(new HttpError(415, 'Use Content-Type: application/json'));
    next();
  });
  router.route('/').get(controller.list).post(controller.create);
  router.route('/:id').get(controller.get).put(controller.update).delete(controller.remove);
  return router;
}
