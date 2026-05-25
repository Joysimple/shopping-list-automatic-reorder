/**
 * SHOWCASE AUTOMATION SCRIPT
 *
 * This script uses Playwright to drive Obsidian.
 */

import { chromium } from 'playwright';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';

// --- CONFIGURATION ---
const OBSIDIAN_PATH = '/Applications/Obsidian.app/Contents/MacOS/Obsidian'; // MacOS Default
const VAULT_PATH = path.join(process.cwd(), 'vault'); // Uses the 'vault' folder in this project
const TEMP_USER_DATA = path.join(process.cwd(), 'showcase', 'temp-obsidian-data');
const DEBUG_PORT = 9222;

async function runShowcase() {
    console.log('🚀 Starting Obsidian Showcase Automation...');

    // Ensure temp data dir exists
    if (!fs.existsSync(TEMP_USER_DATA)) fs.mkdirSync(TEMP_USER_DATA, { recursive: true });

    console.log(`📂 Vault Path: ${VAULT_PATH}`);

    // 1. Manually spawn Obsidian with debugging enabled
    const obsidianProcess = spawn(
        OBSIDIAN_PATH,
        [VAULT_PATH, `--user-data-dir=${TEMP_USER_DATA}`, `--remote-debugging-port=${DEBUG_PORT}`],
        {
            detached: true,
            stdio: 'ignore',
        },
    );
    obsidianProcess.unref();

    console.log('⏳ Waiting for Obsidian to initialize DevTools...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // 2. Connect via CDP (Chrome DevTools Protocol)
    console.log(`🔗 Connecting to DevTools on port ${DEBUG_PORT}...`);
    const browser = await chromium.connectOverCDP(`http://localhost:${DEBUG_PORT}`);
    const context = browser.contexts()[0];

    console.log('👀 Inspecting available pages...');
    context.pages().forEach((p) => console.log(`   - Page: ${p.url()}`));

    let page = context
        .pages()
        .find((p) => p.url().includes('app://') || p.url().includes('obsidian.asar'));

    if (!page) {
        console.log('⏳ Waiting for main app page (logging all attempts)...');
        // Wait for the app page to be created
        page = await new Promise((resolve) => {
            const check = setInterval(async () => {
                const pages = context.pages();
                pages.forEach((p) => {
                    if (p.url() !== 'about:blank') {
                        console.log(`   - Found Page: ${p.url()}`);
                    }
                });
                const p = pages.find(
                    (pg) => pg.url().includes('app://') || pg.url().includes('obsidian.asar'),
                );
                if (p) {
                    clearInterval(check);
                    resolve(p);
                }
            }, 2000);
        });
    }

    console.log('🏁 Page detected. Setting up viewport and focus...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.bringToFront();
    await page.focus('body');
    await page.waitForTimeout(2000);

    try {
        // 1. Setup: Create a new demo note
        console.log('📝 Creating demo note...');
        await page.keyboard.press('Meta+n');
        await page.waitForTimeout(1000);

        // 2. Typing content
        console.log('⌨️ Typing content...');
        await page.keyboard.type('Weekend Shopping List', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('#shopping-list', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');

        // 3. Category 1: Produce
        await page.keyboard.type('## Produce', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('- [ ] Organic Apples', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Bananas', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Spinach', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Avocado', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.keyboard.press('Enter');

        // 4. Category 2: Dairy
        await page.keyboard.type('## Dairy', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('- [ ] Whole Milk', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Greek Yogurt', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Butter', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.keyboard.type('Cheese', { delay: 50 });
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);

        // --- SWITCH TO READING MODE ---
        console.log('📖 Switching to Reading Mode...');
        await page.keyboard.press('Meta+e'); // Standard Obsidian shortcut for Toggle Live Preview/Reading
        await page.waitForTimeout(2000);

        // 5. Demonstrate Reordering
        console.log('✅ Demonstrating reordering...');
        // In Reading Mode, checkboxes are real input elements or specific spans
        const appleCheckbox = page
            .locator('.task-list-item', { hasText: 'Organic Apples' })
            .locator('input[type="checkbox"], .task-list-item-checkbox');

        if ((await appleCheckbox.count()) > 0) {
            await appleCheckbox.first().click();
        } else {
            console.log('⚠️ Reading mode checkbox not found, trying text click...');
            await page.locator('text="Organic Apples"').click({ position: { x: -20, y: 10 } });
        }

        await page.waitForTimeout(3000);

        // 6. Demonstrate Buttons
        console.log('🔘 Demonstrating UI buttons...');
        const produceHeader = page.locator('h2', { hasText: 'Produce' });
        await produceHeader.scrollIntoViewIfNeeded();

        const hideBtn = page.locator('.sl-collapse-button').first();
        if (await hideBtn.isVisible()) {
            console.log('   Clicking Hide...');
            await hideBtn.click();
            await page.waitForTimeout(1500);
            await hideBtn.click();
            console.log('   Clicking Show...');
        }

        const hideCompletedBtn = page.locator('.sl-completed-button').first();
        if (await hideCompletedBtn.isVisible()) {
            console.log('   Clicking Hide Completed...');
            await hideCompletedBtn.click();
            await page.waitForTimeout(2000);
            await hideCompletedBtn.click();
        }

        // --- SWITCH BACK TO EDITOR FOR DUPLICATE FIX ---
        console.log('✍️ Switching back to Editor for duplicate fix...');
        await page.keyboard.press('Meta+e');
        await page.waitForTimeout(2000);

        // 8. Demonstrate the "Duplicate Fix"
        console.log('✨ Demonstrating smart duplicate handling...');
        await page.keyboard.press('Meta+Home');
        // Go to ## Produce header (Line 4)
        for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
        await page.keyboard.press('End'); // Go to end of header line
        await page.keyboard.press('Enter'); // Create new line at top of list

        // Type the duplicate item
        await page.keyboard.type('Organic Apples', { delay: 50 });
        await page.keyboard.press('Enter');
        console.log(
            '   Notice: The new item stays at the top, while the checked one remains at the bottom.',
        );

        await page.waitForTimeout(4000);
        console.log('🎬 Showcase complete!');
    } catch (err) {
        console.error('❌ Error during showcase:', err);
    } finally {
        await page.waitForTimeout(2000);
        await browser.close();
        // Since we spawned it manually, we should kill it
        process.kill(obsidianProcess.pid!);
    }
}

runShowcase();
