import { expect, test, type Page } from '@playwright/test';

// These tests run against a dev server without Supabase configuration (see
// the `chromium-demo` project in playwright.config.ts), so the app starts in
// demo mode with local fixture data.
async function expectDemoMode(page: Page) {
  await expect(page.getByText('Demo-Modus').first()).toBeAttached();
  await expect(page.getByRole('button', { name: 'Jetzt anmelden' })).toHaveCount(0);
}

// The planner renders all module sections at once; only the active one is visible.
function visibleModule(page: Page) {
  return page.locator('section.module.is-visible');
}

// On mobile widths the sidebar buttons are replaced by a select.
async function switchModuleOnMobile(page: Page, label: string) {
  await page.getByRole('combobox', { name: 'Bereich wechseln' }).selectOption({ label });
}

test('shows the planner shell and lets the user open the shopping module', async ({ page }) => {
  await page.goto('/');

  const brandHeading = page.getByRole('heading', { name: 'Frey Frey' }).first();

  await expect(brandHeading).toBeVisible();

  await expectDemoMode(page);

  await page.getByRole('button', { name: 'Einkauf' }).click();
  await expect(page.getByRole('button', { name: 'Liste erstellen' })).toBeVisible();
  await page.getByRole('button', { name: 'Liste erstellen' }).click();
  await expect(page.getByRole('dialog', { name: 'Neue Einkaufsliste' })).toBeVisible();
  await expect(page.getByRole('dialog').getByLabel('Artikel hinzufügen')).toHaveCount(0);
  await page.getByRole('dialog').getByLabel('Listenname').fill('Markteinkauf');
  await page.getByRole('dialog').getByLabel('Datum').fill('2026-05-08');
  await page.getByRole('dialog').getByRole('button', { name: 'Liste erstellen' }).click();

  const shoppingDialog = page.getByRole('dialog', { name: 'Markteinkauf' });
  await expect(shoppingDialog).toBeVisible();

  const quickAddInput = shoppingDialog.getByLabel('Artikel hinzufügen');

  await expect(quickAddInput).toBeFocused();
  await quickAddInput.fill('1 Brot');
  await quickAddInput.press('Enter');
  await expect(quickAddInput).toBeFocused();
  await expect(quickAddInput).toHaveValue('');
  await quickAddInput.fill('Butter');
  await quickAddInput.press('Enter');

  await shoppingDialog.getByRole('checkbox', { name: 'Brot' }).check();
  await expect(shoppingDialog.getByRole('checkbox', { name: 'Brot' })).toBeChecked();
  await shoppingDialog.getByRole('button', { name: 'Artikel Butter löschen' }).click();
  await expect(shoppingDialog.getByRole('checkbox', { name: 'Butter' })).toHaveCount(0);
  await shoppingDialog.getByRole('button', { name: 'Schließen' }).click();

  await visibleModule(page).getByRole('heading', { name: 'Markteinkauf' }).click();
  await expect(shoppingDialog.getByRole('checkbox', { name: 'Brot' })).toBeChecked();
  await shoppingDialog.getByRole('button', { name: 'Schließen' }).click();

  await visibleModule(page).getByRole('button', { name: 'Einkaufsliste Markteinkauf Aktionen' }).click();
  await page.getByRole('button', { name: 'Bearbeiten' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Einkaufsliste bearbeiten' });
  await expect(editDialog.getByLabel('Artikel hinzufügen')).toHaveCount(0);
  await editDialog.getByLabel('Listenname').fill('Wochenmarkt');
  await editDialog.getByRole('button', { name: 'Liste speichern' }).click();

  await visibleModule(page).getByRole('heading', { name: 'Wochenmarkt' }).click();
  await expect(page.getByRole('dialog', { name: 'Wochenmarkt' }).getByRole('checkbox', { name: 'Brot' })).toBeChecked();
});

test('creates, opens and deletes a note in demo mode', async ({ page }) => {
  await page.goto('/');

  await expectDemoMode(page);

  await page.getByRole('navigation', { name: 'Module' }).getByRole('button', { name: 'Notizen' }).click();
  await page.getByRole('button', { name: 'Neue Notiz erstellen' }).click();

  const createDialog = page.getByRole('dialog', { name: 'Neue Notiz' });
  await expect(createDialog).toBeVisible();
  await expect(createDialog.getByPlaceholder('Kategorie')).toHaveCount(0);
  await createDialog.getByLabel('Notiztitel').fill('Hinweis');
  await createDialog.locator('.note-rich-text-surface').click();
  await page.keyboard.type('Nicht vergessen.');
  await createDialog.getByRole('button', { name: 'Notiz speichern' }).click();
  await expect(createDialog).toHaveCount(0);

  await page.getByRole('button', { name: 'Notiz Hinweis öffnen' }).click();
  const noteDialog = page.getByRole('dialog', { name: 'Hinweis' });
  await expect(noteDialog.getByText('Nicht vergessen.')).toBeVisible();
  await noteDialog.getByRole('button', { name: 'Abbrechen' }).click();

  await page.getByRole('button', { name: 'Notiz Hinweis löschen' }).click();
  await expect(page.getByRole('heading', { name: 'Löschen?' })).toBeVisible();
  await expect(page.getByText('Notiz Hinweis löschen?')).toBeVisible();
  await page.getByRole('button', { name: 'Löschen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Notiz Hinweis öffnen' })).toHaveCount(0);
});

test('creates and checks a todo list item in demo mode', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' }).first()).toBeVisible();

  await expectDemoMode(page);

  await page.getByRole('button', { name: 'To-dos' }).click();
  await expect(page.getByRole('button', { name: 'Liste erstellen' })).toBeVisible();

  await page.getByRole('button', { name: 'Liste erstellen' }).click();
  await expect(page.getByRole('dialog', { name: 'Neue Todo-Liste' })).toBeVisible();
  await page.getByRole('dialog').getByLabel('Listenname').fill('Haushalt');
  await page.getByRole('dialog').getByLabel('Fristdatum (optional)').fill('2026-05-04');
  await page.getByRole('dialog').getByRole('button', { name: 'Liste erstellen' }).click();
  await expect(page.getByRole('dialog', { name: 'Haushalt' })).toBeVisible();

  await expect(page.getByRole('dialog')).not.toContainText('Ohne Datum');
  await expect(page.getByRole('dialog')).not.toContainText('Neues Todo');
  await expect(page.getByRole('dialog')).not.toContainText('Noch keine To-dos erfasst. Tippe oben etwas ein und drücke Enter.');

  const quickAddInput = page.getByRole('dialog').getByLabel('Todo hinzufügen');

  await quickAddInput.fill('Muell rausbringen');
  await quickAddInput.press('Enter');
  await expect(quickAddInput).toBeFocused();
  await expect(quickAddInput).toHaveValue('');
  await expect(page.getByRole('dialog').getByRole('checkbox', { name: 'Muell rausbringen' })).not.toBeChecked();

  await page.getByRole('dialog').getByRole('checkbox', { name: 'Muell rausbringen' }).check();
  await expect(page.getByRole('dialog').getByRole('checkbox', { name: 'Muell rausbringen' })).toBeChecked();
  await page.getByRole('dialog').getByRole('button', { name: 'Schließen' }).click();

  const todoListCard = visibleModule(page).getByText('Haushalt').locator('xpath=ancestor::article[1]');
  await expect(todoListCard).toContainText('04.05.2026');
  await expect(todoListCard).toContainText('0 offen · 1 gesamt');
});

test('edits and deletes a todo list through the action menu on mobile widths', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' }).first()).toBeVisible();

  await expectDemoMode(page);

  await switchModuleOnMobile(page, 'To-dos');
  await visibleModule(page).getByRole('button', { name: 'Liste erstellen' }).click();
  await expect(page.getByRole('dialog', { name: 'Neue Todo-Liste' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Liste erstellen' }).click();
  await expect(page.getByRole('dialog', { name: 'Todo Liste 1' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Zurück' }).click();

  const listCard = visibleModule(page).getByText('Todo Liste 1').locator('xpath=ancestor::article[1]');

  await listCard.getByRole('button', { name: 'Todo-Liste Todo Liste 1 Aktionen' }).click();
  await page.getByRole('button', { name: 'Bearbeiten' }).click();
  await expect(page.getByRole('heading', { name: 'Todo-Liste bearbeiten' })).toBeVisible();
  await page.getByRole('dialog').getByPlaceholder('z. B. Wochenende').fill('Wochenende');
  await page.getByRole('dialog').getByLabel('Fristdatum (optional)').fill('2026-05-04');
  await page.getByRole('dialog').getByRole('button', { name: 'Liste speichern' }).click();

  const editedListCard = visibleModule(page).getByText('Wochenende').locator('xpath=ancestor::article[1]');
  await expect(editedListCard).toContainText('04.05.2026');

  await editedListCard.getByRole('button', { name: 'Todo-Liste Wochenende Aktionen' }).click();
  await page.getByRole('button', { name: 'Löschen' }).click();
  await expect(page.getByRole('heading', { name: 'Todo-Liste löschen?' })).toBeVisible();
  await page.getByRole('button', { name: /^Löschen$/ }).click();

  await expect(visibleModule(page).getByText('Wochenende')).toHaveCount(0);
});

test('keeps the todo create action anchored close below the mobile module switcher', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' }).first()).toBeVisible();

  await expectDemoMode(page);

  await switchModuleOnMobile(page, 'To-dos');

  const mobileTopbar = page.locator('.mobile-topbar');
  const createButton = visibleModule(page).getByRole('button', { name: 'Liste erstellen' });

  // Demo data starts empty, so create the list whose card position is measured.
  await createButton.click();
  await page.getByRole('dialog').getByLabel('Listenname').fill('Schule');
  await page.getByRole('dialog').getByRole('button', { name: 'Liste erstellen' }).click();
  await page.getByRole('dialog', { name: 'Schule' }).getByRole('button', { name: 'Zurück' }).click();

  const firstTodoCard = visibleModule(page).getByText('Schule').locator('xpath=ancestor::article[1]');

  await expect(createButton).toBeVisible();
  await expect(firstTodoCard).toBeVisible();

  const [topbarBox, createButtonBox, firstTodoCardBox] = await Promise.all([
    mobileTopbar.boundingBox(),
    createButton.boundingBox(),
    firstTodoCard.boundingBox(),
  ]);

  expect(topbarBox).not.toBeNull();
  expect(createButtonBox).not.toBeNull();
  expect(firstTodoCardBox).not.toBeNull();

  const gapBelowTopbar = createButtonBox!.y - (topbarBox!.y + topbarBox!.height);
  const gapBelowCreateButton = firstTodoCardBox!.y - (createButtonBox!.y + createButtonBox!.height);

  expect(gapBelowTopbar).toBeGreaterThanOrEqual(0);
  expect(gapBelowTopbar).toBeLessThanOrEqual(28);
  expect(gapBelowCreateButton).toBeGreaterThanOrEqual(0);
  expect(gapBelowCreateButton).toBeLessThanOrEqual(28);
});

test('keeps the meal planner card wide on large desktop screens', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1200 });
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' }).first()).toBeVisible();

  await expectDemoMode(page);

  await page.getByRole('button', { name: 'Essensplan' }).click();
  await expect(page.getByRole('button', { name: '2 Wochen' })).toBeVisible();

  const content = page.locator('main.content');
  const moduleLayout = page.locator('.module-layout.meals-module-layout');
  const mealContent = moduleLayout.locator('> .meals-module-content').first();

  const [contentShellBox, layoutBox, contentBox] = await Promise.all([
    content.boundingBox(),
    moduleLayout.boundingBox(),
    mealContent.boundingBox(),
  ]);

  expect(contentShellBox).not.toBeNull();
  expect(layoutBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(contentBox!.width).toBeGreaterThan(1100);
  expect(Math.abs(layoutBox!.width - contentBox!.width)).toBeLessThan(32);
  expect(layoutBox!.y - contentShellBox!.y).toBeLessThan(40);
  await expect(moduleLayout.locator('> .panel')).toHaveCount(0);
});

test('shows the upload-only documents module with a larger capture card on desktop', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' }).first()).toBeVisible();

  await expectDemoMode(page);

  await page.getByRole('button', { name: 'Dokumente' }).click();

  await expect(page.getByRole('heading', { name: 'Dokument erfassen' })).toBeVisible();
  await expect(page.getByText('Datei hochladen')).toBeVisible();
  await expect(page.getByPlaceholder('Dokument', { exact: true })).toHaveCount(0);
  await expect(page.getByPlaceholder('Kategorie')).toHaveCount(0);
  await expect(page.getByPlaceholder('Status')).toHaveCount(0);
  await expect(page.getByPlaceholder('Link zum Dokument (optional)')).toHaveCount(0);

  const [uploadCardBox, visibleDocumentsCardBox, documentModuleBox] = await Promise.all([
    page.locator('form.document-form-panel').boundingBox(),
    page.locator('.document-module-layout > .panel').nth(1).boundingBox(),
    page.locator('.document-module-layout').boundingBox(),
  ]);

  expect(uploadCardBox).not.toBeNull();
  expect(visibleDocumentsCardBox).not.toBeNull();
  expect(documentModuleBox).not.toBeNull();
  expect(uploadCardBox!.width).toBeGreaterThanOrEqual(540);
  expect(uploadCardBox!.height).toBeGreaterThanOrEqual(250);
  expect(Math.abs(uploadCardBox!.width - documentModuleBox!.width)).toBeLessThanOrEqual(4);
  expect(visibleDocumentsCardBox!.y - (uploadCardBox!.y + uploadCardBox!.height)).toBeLessThanOrEqual(20);
  expect(visibleDocumentsCardBox!.y).toBeGreaterThan(uploadCardBox!.y + uploadCardBox!.height - 6);
  expect(Math.abs(visibleDocumentsCardBox!.x - uploadCardBox!.x)).toBeLessThanOrEqual(24);

  await page.locator('input[type="file"][name="file"]').setInputFiles({
    name: 'Loeschprobe.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('pdf-content'),
  });
  await page.getByRole('button', { name: 'Dokument speichern' }).click();
  await page.getByRole('button', { name: 'Dokument Loeschprobe löschen' }).click();
  await expect(page.getByRole('heading', { name: 'Löschen?' })).toBeVisible();
  await expect(page.getByText('Dokument Loeschprobe löschen?')).toBeVisible();
  await page.getByRole('button', { name: 'Löschen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Dokument Loeschprobe löschen' })).toHaveCount(0);
});

test('keeps the document edit dialog free of horizontal scrolling for long names', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' }).first()).toBeVisible();

  await expectDemoMode(page);

  await page.getByRole('button', { name: 'Dokumente' }).click();
  await page.locator('input[type="file"][name="file"]').setInputFiles({
    name: 'zertifikat.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('pdf-content'),
  });
  await page.getByRole('button', { name: 'Dokument speichern' }).click();
  await page.getByRole('button', { name: 'Dokument zertifikat bearbeiten' }).click();

  const longName = 'certificate_of_completion_react_certificate_of_completion_react';

  await page.getByLabel('Dokumentname bearbeiten').fill(longName);
  await expect(page.getByRole('heading', { name: longName })).toBeVisible();
  await expect(
    page.getByText('Datei-Uploads behalten ihren Storage-Link. Nur die Metadaten werden geändert.'),
  ).toHaveCount(0);

  const dialogHasHorizontalOverflow = await page.locator('section[role="dialog"]').evaluate((element) => {
    return element.scrollWidth > element.clientWidth;
  });

  expect(dialogHasHorizontalOverflow).toBe(false);
});

test('shows the filename above a two-row action grid when the filename is long', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' }).first()).toBeVisible();

  await expectDemoMode(page);

  await page.getByRole('button', { name: 'Dokumente' }).click();

  const longName = 'certificate_of_completion_react_certificate_of_completion_react_certificate_of_completion';

  await page.locator('input[type="file"][name="file"]').setInputFiles({
    name: `${longName}.pdf`,
    mimeType: 'application/pdf',
    buffer: Buffer.from('pdf-content'),
  });
  await page.getByRole('button', { name: 'Dokument speichern' }).click();

  const row = page.locator('.document-grid li').first();
  // First child: icon + name, second child: action button grid.
  const head = row.locator(':scope > div').nth(0);
  const actions = row.locator(':scope > div').nth(1);
  const openButton = row.getByRole('link', { name: 'Datei öffnen' });
  const previewButton = row.getByRole('button', { name: `Dokument ${longName} in Vorschau öffnen` });
  const editButton = row.getByRole('button', { name: `Dokument ${longName} bearbeiten` });
  const deleteButton = row.getByRole('button', { name: `Dokument ${longName} löschen` });

  await expect(row.getByText(longName)).toBeVisible();

  const rowHasHorizontalOverflow = await row.evaluate((element) => element.scrollWidth > element.clientWidth);
  const [headBox, actionsBox, openBox, previewBox, editBox, deleteBox] = await Promise.all([
    head.boundingBox(),
    actions.boundingBox(),
    openButton.boundingBox(),
    previewButton.boundingBox(),
    editButton.boundingBox(),
    deleteButton.boundingBox(),
  ]);

  expect(rowHasHorizontalOverflow).toBe(false);
  expect(headBox).not.toBeNull();
  expect(actionsBox).not.toBeNull();
  expect(openBox).not.toBeNull();
  expect(previewBox).not.toBeNull();
  expect(editBox).not.toBeNull();
  expect(deleteBox).not.toBeNull();
  expect(actionsBox!.y).toBeGreaterThan(headBox!.y + headBox!.height - 6);
  expect(Math.abs(openBox!.y - previewBox!.y)).toBeLessThanOrEqual(6);
  expect(Math.abs(editBox!.y - deleteBox!.y)).toBeLessThanOrEqual(6);
  expect(editBox!.y).toBeGreaterThan(openBox!.y + 20);
});

test('shows three document cards per row on large displays and fewer on smaller widths', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Frey Frey' }).first()).toBeVisible();

  await expectDemoMode(page);

  await page.getByRole('button', { name: 'Dokumente' }).click();

  for (const name of ['Alpha.pdf', 'Bravo.pdf', 'Charlie.pdf']) {
    await page.locator('input[type="file"][name="file"]').setInputFiles({
      name,
      mimeType: 'application/pdf',
      buffer: Buffer.from('pdf-content'),
    });
    await page.getByRole('button', { name: 'Dokument speichern' }).click();
  }

  const cards = page.locator('.document-grid li');

  await page.setViewportSize({ width: 1600, height: 1200 });

  const [firstLarge, secondLarge, thirdLarge] = await Promise.all([
    cards.nth(0).boundingBox(),
    cards.nth(1).boundingBox(),
    cards.nth(2).boundingBox(),
  ]);

  expect(firstLarge).not.toBeNull();
  expect(secondLarge).not.toBeNull();
  expect(thirdLarge).not.toBeNull();
  expect(Math.abs(firstLarge!.y - secondLarge!.y)).toBeLessThanOrEqual(6);
  expect(Math.abs(secondLarge!.y - thirdLarge!.y)).toBeLessThanOrEqual(6);

  await page.setViewportSize({ width: 1100, height: 1200 });

  const [firstMedium, secondMedium, thirdMedium] = await Promise.all([
    cards.nth(0).boundingBox(),
    cards.nth(1).boundingBox(),
    cards.nth(2).boundingBox(),
  ]);

  expect(firstMedium).not.toBeNull();
  expect(secondMedium).not.toBeNull();
  expect(thirdMedium).not.toBeNull();
  expect(Math.abs(firstMedium!.y - secondMedium!.y)).toBeLessThanOrEqual(6);
  expect(thirdMedium!.y).toBeGreaterThan(firstMedium!.y + 20);
});

test('plays a full classic Busfahrer game with three players on one phone', async ({ page }) => {
  const rankValues: Record<string, number> = { Bube: 11, Dame: 12, König: 13, Ass: 14 };
  // The game ignores taps within 400 ms after a step; fast-forward the clock instead of waiting.
  const nextStep = () => page.clock.fastForward(500);

  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expectDemoMode(page);

  await switchModuleOnMobile(page, 'Games');
  await visibleModule(page).getByRole('button', { name: 'Busfahrer spielen' }).click();
  await page.locator('label', { hasText: 'Klassisch' }).click();
  await expect(page.getByRole('radio', { name: /Klassisch/ })).toBeChecked();
  await page.getByRole('button', { name: 'Spieler hinzufügen' }).click();
  await page.getByLabel('Spieler 1', { exact: true }).fill('Anna');
  await page.getByLabel('Spieler 2', { exact: true }).fill('Ben');
  await page.getByLabel('Spieler 3', { exact: true }).fill('Cem');
  await page.getByRole('button', { name: 'Spiel starten' }).click();

  const game = visibleModule(page);
  const answerButton = game.getByRole('button', { name: /^(Rot|Höher|Innerhalb|♥ Herz)$/ });
  const nextButton = game.getByRole('button', { name: /^Weiter/ });

  for (let turn = 0; turn < 12; turn += 1) {
    const player = ['Anna', 'Ben', 'Cem'][turn % 3];
    await expect(game.getByText(`${player} ist dran`)).toBeVisible();

    await nextStep();
    await answerButton.click();
    await expect(game.getByRole('status')).toContainText(`${player} `);

    if (turn === 4) {
      // The running game survives a reload (e.g. the app being killed in the background).
      await page.reload();
      await expect(game.getByRole('status')).toContainText(`${player} `);
    }

    await nextStep();
    await nextButton.click();
  }

  await expect(game.getByText('Pyramide', { exact: true }).last()).toBeVisible();
  for (let reveal = 0; reveal < 10; reveal += 1) {
    await nextStep();
    await page.getByRole('button', { name: 'Nächste Karte aufdecken' }).click();
  }
  await nextStep();
  await page.getByRole('button', { name: 'Busfahrer ermitteln' }).click();

  const finished = game.getByText(/ist angekommen!|niemand muss Bus fahren/);
  const busQuestion = game.getByText(/^Höher oder tiefer als /);

  for (let guess = 0; guess < 300 && !(await finished.isVisible()); guess += 1) {
    const rankLabel = (await busQuestion.textContent())!.replace('Höher oder tiefer als ', '').replace('?', '');
    const rank = rankValues[rankLabel] ?? Number(rankLabel);

    await nextStep();
    await game.getByRole('button', { name: rank <= 8 ? 'Höher' : 'Tiefer' }).click();
  }

  await expect(finished).toBeVisible();

  await nextStep();
  await page.getByRole('button', { name: 'Nochmal spielen' }).click();
  await expect(page.getByText('Anna ist dran')).toBeVisible();
});

test('plays the Münchner Busfahrer variant on one phone and passes after 3 correct guesses', async ({ page }) => {
  const rankValues: Record<string, number> = { Bube: 11, Dame: 12, König: 13, Ass: 14 };
  const nextStep = () => page.clock.fastForward(500);

  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expectDemoMode(page);

  await switchModuleOnMobile(page, 'Games');
  const game = visibleModule(page);
  await game.getByRole('button', { name: 'Busfahrer spielen' }).click();

  // Münchner variant and "ace high" are the defaults.
  await expect(page.getByRole('radio', { name: /Münchner Variante/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Höchste Karte' })).toBeChecked();

  await page.getByRole('button', { name: 'Spieler hinzufügen' }).click();
  await page.getByLabel('Spieler 1', { exact: true }).fill('Anna');
  await page.getByLabel('Spieler 2', { exact: true }).fill('Ben');
  await page.getByLabel('Spieler 3', { exact: true }).fill('Cem');
  await page.getByRole('button', { name: 'Spiel starten' }).click();

  const raute = game.getByLabel('Raute');
  await expect(raute.getByRole('img')).toHaveCount(9);
  await expect(game.getByRole('status')).toHaveText('Ausgelost – du fängst an');

  const heading = game.getByText(/^(Anna|Ben|Cem) ist dran$/);
  const startingPlayer = (await heading.textContent())!.replace(' ist dran', '');
  const players = ['Anna', 'Ben', 'Cem'];
  const nextPlayer = players[(players.indexOf(startingPlayer) + 1) % players.length];

  // The first guess must be in the longest row: only its two outer cards are tappable.
  await expect(raute.locator('button:not([disabled])')).toHaveCount(2);

  const passButton = game.getByRole('button', { name: `Weitergeben an ${nextPlayer}` });

  for (let guess = 0; guess < 120 && !(await passButton.isVisible()); guess += 1) {
    // Pick the tappable outer card that is easiest to guess (furthest from the middle).
    const labels = await raute.locator('button:not([disabled])').evaluateAll(
      (buttons) => buttons.map((button) => button.getAttribute('aria-label') ?? ''),
    );
    const candidates = labels.map((label) => {
      const rankLabel = label.split(' ').pop() ?? '';
      return { label, value: rankValues[rankLabel] ?? Number(rankLabel) };
    });
    const best = candidates.sort((a, b) => Math.abs(b.value - 8) - Math.abs(a.value - 8))[0];

    await nextStep();
    await raute.getByRole('button', { name: best.label, exact: true }).click();
    await game.getByRole('button', { name: best.value <= 8 ? 'Höher' : 'Tiefer' }).click();
    await expect(game.getByRole('status')).toContainText(/Richtig!|Falsch!|Gleich!/);

    // A miss shows a reaction GIF full screen (tap skips it); a plain hit stays out of the way.
    const overlay = page.getByRole('button', { name: 'Animation überspringen' });
    const status = (await game.getByRole('status').textContent()) ?? '';
    if (status.startsWith('Falsch!')) {
      await expect(overlay.locator('img')).toBeVisible();
      await overlay.click();
      await expect(overlay).toBeHidden();
    } else if (status.startsWith('Richtig!')) {
      await expect(overlay).toHaveCount(0);
    }

    if (guess === 1) {
      await page.reload();
      await expect(game.getByText(`${startingPlayer} ist dran`)).toBeVisible();
    }
  }

  await expect(game.getByText(/richtig in Folge/)).toBeVisible();
  await nextStep();
  await passButton.click();
  await expect(game.getByText(`${nextPlayer} ist dran`)).toBeVisible();
  await expect(game.getByText('0 von 3 richtig')).toBeVisible();

  // Ending the game keeps the players for the next round.
  await game.getByRole('button', { name: 'Spiel beenden' }).click();
  await page.getByRole('button', { name: 'Beenden', exact: true }).click();
  await expect(page.getByLabel('Spieler 3', { exact: true })).toHaveValue('Cem');
});
