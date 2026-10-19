import { HttpError } from './errors.js';

// One store per application instance. Task 4 can replace this module with a database.
export function createStore() {
  const tasks = new Map();
  let nextId = 1;
  const read = id => {
    const task = tasks.get(id);
    if (!task) throw new HttpError(404, 'Task not found');
    return task;
  };
  return {
    list: () => [...tasks.values()].reverse().map(task => ({ ...task })),
    get: id => ({ ...read(id) }),
    create: text => {
      if (tasks.size >= 1000) throw new HttpError(409, 'Demo limit reached: delete a task before adding another');
      const task = { id: nextId++, text, completed: false, createdAt: new Date().toISOString() };
      tasks.set(task.id, task);
      return { ...task };
    },
    update: (id, changes) => {
      const task = { ...read(id), ...changes };
      tasks.set(id, task);
      return { ...task };
    },
    remove: id => { read(id); tasks.delete(id); }
  };
}
