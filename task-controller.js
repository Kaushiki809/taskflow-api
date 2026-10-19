import { parseId, validateBody } from './validation.js';

export function taskController(store) {
  return {
    list: (req, res) => res.status(200).json(store.list()),
    get: (req, res) => res.status(200).json(store.get(parseId(req.params.id))),
    create: (req, res) => {
      const { text } = validateBody(req.body, true);
      const task = store.create(text);
      res.location(`/api/tasks/${task.id}`).status(201).json(task);
    },
    update: (req, res) => {
      const id = parseId(req.params.id);
      store.get(id);
      res.status(200).json(store.update(id, validateBody(req.body)));
    },
    remove: (req, res) => { store.remove(parseId(req.params.id)); res.status(204).end(); }
  };
}
