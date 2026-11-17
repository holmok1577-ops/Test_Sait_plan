const { test, expect } = require('@playwright/test');

test('создание, выполнение, возврат в работу, удаление и сохранение после перезагрузки', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Место для новых планов')).toBeVisible();
  await page.getByRole('textbox', { name: 'Новая задача' }).fill('  Подготовить тестовое задание  ');
  await page.getByRole('button', { name: 'Добавить' }).click();
  await page.reload();
  const task = page.getByRole('checkbox', { name: 'Подготовить тестовое задание' });
  await expect(task).not.toBeChecked();
  await task.check();
  await page.reload();
  await expect(task).toBeChecked();
  await page.getByRole('button', { name: 'В работе', exact: true }).click();
  await expect(page.getByText('Всё сделано. Можно выдохнуть.')).toBeVisible();
  await page.getByRole('button', { name: 'Готово', exact: true }).click();
  // The task leaves the completed filter immediately; assert the resulting UI.
  await task.click();
  await expect(task).toHaveCount(0);
  await page.getByRole('button', { name: 'В работе', exact: true }).click();
  await expect(task).not.toBeChecked();
  await page.reload();
  await expect(task).not.toBeChecked();
  await page.getByRole('button', { name: 'Удалить задачу: Подготовить тестовое задание' }).click();
  await page.reload();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
});

test('пустой ввод, Enter, безопасный текст и длинная задача', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Новая задача' });
  await input.fill('   ');
  await input.press('Enter');
  await expect(page.getByRole('alert').filter({ hasText: 'Введите задачу' })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  const literal = '<img src=x onerror=alert(1)>';
  await input.fill(literal);
  await input.press('Enter');
  await expect(page.getByText(literal, { exact: true })).toBeVisible();
  await expect(page.locator('#task-list img')).toHaveCount(0);
  await input.fill('Д'.repeat(300));
  await input.press('Enter');
  await expect(page.getByRole('checkbox')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('повреждённое хранилище не перезаписывается', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('yasno.tasks.v1', '{broken'));
  await page.goto('/');
  await expect(page.getByText(/Не удалось прочитать сохранённые задачи/)).toBeVisible();
  await page.getByRole('textbox').fill('Новая задача');
  await page.getByRole('button', { name: 'Добавить' }).click();
  expect(await page.evaluate(() => localStorage.getItem('yasno.tasks.v1'))).toBe('{broken');
});

test('ошибка записи показана пользователю, интерфейс продолжает работать', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Quota exceeded', 'QuotaExceededError'); }; });
  await page.goto('/');
  await page.getByRole('textbox').fill('Несохранённая задача');
  await page.getByRole('button', { name: 'Добавить' }).click();
  await expect(page.getByRole('checkbox', { name: 'Несохранённая задача' })).toBeVisible();
  await expect(page.getByText(/Браузер не разрешил сохранить изменения/)).toBeVisible();
});

test('визуальная проверка', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.screenshot({ path: testInfo.outputPath('empty.png'), fullPage: true });
  for (const title of ['Подготовить тестовое задание', 'Проверить все четыре функции', 'Отправить ссылку на проект']) {
    await page.getByRole('textbox').fill(title);
    await page.getByRole('button', { name: 'Добавить' }).click();
  }
  await page.getByRole('checkbox').first().check();
  await page.screenshot({ path: testInfo.outputPath('tasks.png'), fullPage: true });
});
