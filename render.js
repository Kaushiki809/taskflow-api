import { filterTasks, taskCounts } from './model.js';

export function renderTasks(tasks, filter) {
  const list = document.querySelector('#task-list');
  const visible = filterTasks(tasks, filter);
  const fragment = document.createDocumentFragment();
  visible.forEach(task => {
    const row = document.createElement('li');
    row.className = `task-row${task.completed ? ' is-complete' : ''}`;
    row.dataset.id = task.id;
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox'; checkbox.className = 'task-check';
    checkbox.id = `task-${task.id}`; checkbox.checked = task.completed;
    const content = document.createElement('div'); content.className = 'task-content';
    const label = document.createElement('label'); label.className = 'task-label'; label.htmlFor = checkbox.id;
    // Treat task input as text, never HTML.
    label.textContent = task.text;
    const date = document.createElement('span'); date.className = 'task-date';
    date.textContent = `Added · ${new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    content.append(label, date);
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete-button';
    remove.dataset.action = 'delete'; remove.setAttribute('aria-label', `Delete task: ${task.text}`);
    remove.innerHTML = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M9 6V4h6v2M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg>';
    row.append(checkbox, content, remove); fragment.append(row);
  });
  list.replaceChildren(fragment);
  const counts = taskCounts(tasks);
  document.querySelector('#active-count').textContent = counts.active;
  document.querySelector('#completed-count').textContent = counts.completed;
  document.querySelector('#total-count').textContent = `${counts.total} task${counts.total === 1 ? '' : 's'}`;
  document.querySelector('#progress').value = counts.percent;
  document.querySelector('#progress').textContent = `${counts.percent}%`;
  document.querySelector('#progress-text').textContent = `${counts.percent}%`;
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  document.querySelector('#empty-state').hidden = visible.length !== 0;
  const empty = filter === 'completed' ? ['Good things take a first step.', 'Completed tasks will appear here.'] : filter === 'active' && tasks.length ? ['All caught up.', 'Every task is complete. Enjoy a little breathing room.'] : ['A fresh start.', 'Add your first task above. Small steps count.'];
  document.querySelector('#empty-title').textContent = empty[0];
  document.querySelector('#empty-description').textContent = empty[1];
  document.querySelector('#list-summary').textContent = counts.total ? `${visible.length} shown · ${counts.active} remaining · ${counts.completed} completed` : 'Your next step starts here.';
}
