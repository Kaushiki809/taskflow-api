export function filterTasks(tasks, filter) {
  return tasks.filter(task => filter === 'active' ? !task.completed : filter === 'completed' ? task.completed : true);
}
export function taskCounts(tasks) {
  const completed = tasks.filter(task => task.completed).length;
  return { total: tasks.length, completed, active: tasks.length - completed, percent: tasks.length ? Math.round(completed / tasks.length * 100) : 0 };
}
