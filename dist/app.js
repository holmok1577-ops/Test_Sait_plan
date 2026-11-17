'use strict';

const STORAGE_KEY = 'yasno.tasks.v1';
const input = document.querySelector('#task-input');
const list = document.querySelector('#task-list');
const error = document.querySelector('#input-error');
const warning = document.querySelector('#storage-warning');
let filter = 'all';
let tasks = [];
let unreadableStorage = false;

function storageWarning(message) {
  warning.textContent = message;
  warning.hidden = false;
  document.querySelector('#save-note').textContent = 'Сохранение недоступно — не закрывайте страницу';
}

try {
  const raw = localStorage.getItem(STORAGE_KEY);
  const saved = raw === null ? [] : JSON.parse(raw);
  if (!Array.isArray(saved) || saved.some(task => !task || typeof task.id !== 'string' || typeof task.text !== 'string' || !task.text.trim() || task.text.length > 300 || typeof task.completed !== 'boolean') || new Set(saved.map(task => task.id)).size !== saved.length) {
    throw new Error('Invalid saved tasks');
  }
  tasks = saved;
} catch {
  unreadableStorage = true;
  storageWarning('Не удалось прочитать сохранённые задачи. Они не перезаписаны. Новые изменения доступны только до закрытия страницы.');
}

function save() {
  if (unreadableStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    warning.hidden = true;
    document.querySelector('#save-note').textContent = 'Задачи сохраняются в этом браузере';
  } catch {
    storageWarning('Браузер не разрешил сохранить изменения. Они останутся только на этой странице до её закрытия или перезагрузки.');
  }
}

function announce(message) {
  document.querySelector('#announcement').textContent = message;
}

function render() {
  list.replaceChildren();
  const visible = tasks.filter(task => filter === 'all' || (filter === 'completed' ? task.completed : !task.completed));
  for (const task of visible) {
    const row = document.createElement('li');
    row.className = `task${task.completed ? ' completed' : ''}`;
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    const text = document.createElement('span');
    text.className = 'task-text';
    text.textContent = task.text;
    label.append(checkbox, text);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'delete-button';
    remove.setAttribute('aria-label', `Удалить задачу: ${task.text}`);
    remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    checkbox.addEventListener('change', () => {
      task.completed = checkbox.checked;
      save();
      const index = visible.indexOf(task);
      render();
      const replacement = list.children[filter === 'all' ? index : Math.min(index, list.children.length - 1)];
      (replacement?.querySelector('input') || document.querySelector(`[data-filter="${filter}"]`)).focus();
      announce(task.completed ? 'Задача выполнена' : 'Задача возвращена в работу');
    });
    remove.addEventListener('click', () => {
      const index = visible.indexOf(task);
      tasks = tasks.filter(item => item.id !== task.id);
      save();
      render();
      (list.children[Math.min(index, list.children.length - 1)]?.querySelector('.delete-button') || input).focus();
      announce('Задача удалена');
    });
    row.append(label, remove);
    list.append(row);
  }
  document.querySelector('#all-count').textContent = tasks.length;
  document.querySelector('#empty-state').hidden = visible.length !== 0;
  const empty = tasks.length === 0 ? ['Место для новых планов', 'Добавьте первое дело — и день станет чуть яснее.'] : filter === 'active' ? ['Всё сделано. Можно выдохнуть.', 'Все ваши задачи выполнены. Время для небольшой паузы.'] : ['Здесь будут ваши победы', 'Отметьте выполненную задачу — она появится здесь.'];
  document.querySelector('#empty-title').textContent = empty[0];
  document.querySelector('#empty-description').textContent = empty[1];
  const done = tasks.filter(task => task.completed).length;
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  document.querySelector('#progress-text').textContent = tasks.length ? `Выполнено ${done} из ${tasks.length} · ${percent}%` : 'Ваш следующий шаг — первая задача';
  document.querySelector('#progress-fill').style.width = `${percent}%`;
  document.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', percent);
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', button.dataset.filter === filter));
}

document.querySelector('#task-form').addEventListener('submit', event => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text || text.length > 300) {
    error.textContent = 'Введите задачу: от 1 до 300 символов.';
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  tasks.push({ id: crypto.randomUUID(), text, completed: false });
  save();
  filter = 'all';
  input.value = '';
  error.hidden = true;
  input.removeAttribute('aria-invalid');
  render();
  input.focus();
  announce('Задача добавлена');
});
input.addEventListener('input', () => { error.hidden = true; input.removeAttribute('aria-invalid'); });
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; render(); }));
document.querySelector('#date').textContent = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' }).format(new Date());
render();
