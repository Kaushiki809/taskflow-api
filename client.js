import { renderTasks } from './render.js';

let tasks = [], filter = 'all', busy = false, pendingDelete = null;
const input = document.querySelector('#task-input');
const status = document.querySelector('#status');
const warning = document.querySelector('#storage-warning');
const dialog = document.querySelector('#delete-dialog');
const themeButton = document.querySelector('#theme-toggle');
function draw() { renderTasks(tasks, filter); }
function showError(message) { warning.textContent = message; warning.hidden = !message; }
async function request(path = '', options = {}) {
  const response = await fetch(`/api/tasks${path}`, { ...options, headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
async function run(action, message) {
  if (busy) return;
  busy = true;
  document.querySelector('#task-form button').disabled = true;
  document.querySelector('#task-list').setAttribute('aria-busy', 'true');
  showError('');
  try { await action(); draw(); status.textContent = message; }
  catch (error) { draw(); showError(`Could not finish the request: ${error.message}. Use Refresh tasks to reconnect.`); }
  finally { busy = false; document.querySelector('#task-form button').disabled = false; document.querySelector('#task-list').setAttribute('aria-busy', 'false'); }
}
const refresh = () => run(async () => { tasks = await request(); }, 'Tasks loaded from the server.');
document.querySelector('#refresh').addEventListener('click', refresh);
document.querySelector('#task-form').addEventListener('submit', event => {
  event.preventDefault();
  if (busy) return;
  const text = input.value.trim();
  const error = !text ? 'Please enter a task.' : text.length > 140 ? 'Use at most 140 characters.' : '';
  document.querySelector('#input-error').textContent = error;
  input.setAttribute('aria-invalid', String(Boolean(error)));
  if (error) { input.focus(); return; }
  run(async () => {
    const task = await request('', { method: 'POST', body: JSON.stringify({ text }) });
    tasks = [task, ...tasks]; filter = 'all'; input.value = '';
    document.querySelector('#character-count').textContent = '0 / 140';
    input.focus();
  }, 'Task added to the server.');
});
input.addEventListener('input', () => {
  document.querySelector('#character-count').textContent = `${input.value.length} / 140`;
  document.querySelector('#input-error').textContent = '';
  input.setAttribute('aria-invalid', 'false');
});
document.querySelector('.filters').addEventListener('click', event => {
  const button = event.target.closest('[data-filter]');
  if (button) { filter = button.dataset.filter; draw(); }
});
document.querySelector('#task-list').addEventListener('change', event => {
  if (!event.target.matches('.task-check')) return;
  if (busy) { draw(); return; }
  const id = Number(event.target.closest('[data-id]').dataset.id);
  const completed = event.target.checked;
  run(async () => {
    const updated = await request(`/${id}`, { method: 'PUT', body: JSON.stringify({ completed }) });
    tasks = tasks.map(task => task.id === id ? updated : task);
  }, 'Task updated on the server.').then(() => (document.getElementById(`task-${id}`) || input).focus());
});
document.querySelector('#task-list').addEventListener('click', event => {
  const button = event.target.closest('[data-action="delete"]');
  if (!button || busy) return;
  pendingDelete = Number(button.closest('[data-id]').dataset.id);
  document.querySelector('#delete-description').textContent = tasks.find(task => task.id === pendingDelete).text;
  dialog.returnValue = ''; dialog.showModal();
});
dialog.addEventListener('close', () => {
  const id = pendingDelete; pendingDelete = null;
  if (dialog.returnValue === 'delete' && id) run(async () => {
    await request(`/${id}`, { method: 'DELETE' });
    tasks = tasks.filter(task => task.id !== id); input.focus();
  }, 'Task deleted from the server.');
});
themeButton.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme !== 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeButton.setAttribute('aria-pressed', String(dark));
  document.querySelector('#theme-label').textContent = dark ? 'Light mode' : 'Dark mode';
});
draw(); refresh();
