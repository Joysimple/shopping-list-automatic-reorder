import { describe, it, expect } from 'vitest';

// Minimal interfaces to match src/main.ts
interface ListItemState {
    text: string;
    checked: boolean;
    originalLine: string;
}

interface SectionState {
    header: string | null;
    items: ListItemState[];
    otherLines: string[];
}

// Extracted logic from main.ts (since we can't easily import the class without a lot of mocking)
function parseSections(content: string): SectionState[] {
    const lines = content.split('\n');
    const sections: SectionState[] = [];
    let currentSection: SectionState = { header: null, items: [], otherLines: [] };

    for (const line of lines) {
        if (line.startsWith('#')) {
            if (
                currentSection.header !== null ||
                currentSection.items.length > 0 ||
                currentSection.otherLines.length > 0
            ) {
                sections.push(currentSection);
            }
            currentSection = { header: line, items: [], otherLines: [] };
        } else {
            const checkboxMatch = line.match(/^(\s*(?:-|\d+\.)\s*\[([ xX])\]\s*)(.*)/);
            if (checkboxMatch) {
                currentSection.items.push({
                    text: checkboxMatch[3],
                    checked: checkboxMatch[2].toLowerCase() === 'x',
                    originalLine: line,
                });
            } else {
                currentSection.otherLines.push(line);
            }
        }
    }
    sections.push(currentSection);
    return sections;
}

function reorderSections(
    current: SectionState[],
    previous: SectionState[],
    settings: { checkedItemsPlacement: 'top' | 'end' },
): string {
    const resultLines: string[] = [];

    for (let i = 0; i < current.length; i++) {
        const currSec = current[i];

        let prevSec =
            previous[i] && previous[i].header === currSec.header
                ? previous[i]
                : previous.find((p) => p.header === currSec.header);

        if (currSec.header) {
            resultLines.push(currSec.header);
        }

        if (!prevSec) {
            const unchecked = currSec.items.filter((item) => !item.checked);
            const checked = currSec.items.filter((item) => item.checked);
            resultLines.push(...currSec.otherLines);
            resultLines.push(...unchecked.map((item) => item.originalLine));
            resultLines.push(...checked.map((item) => item.originalLine));
            continue;
        }

        const prevItemsPool = new Map<string, boolean[]>();
        prevSec.items.forEach((item) => {
            const text = item.text.trim();
            if (!prevItemsPool.has(text)) prevItemsPool.set(text, []);
            prevItemsPool.get(text)!.push(item.checked);
        });

        const newlyChecked: ListItemState[] = [];
        const newlyUnchecked: ListItemState[] = [];
        const stillChecked: ListItemState[] = [];
        const stillUnchecked: ListItemState[] = [];

        const itemAssignments = new Array<string | null>(currSec.items.length).fill(null);

        currSec.items.forEach((item, index) => {
            const text = item.text.trim();
            const pool = prevItemsPool.get(text);
            if (pool) {
                const poolIndex = pool.indexOf(item.checked);
                if (poolIndex !== -1) {
                    pool.splice(poolIndex, 1);
                    itemAssignments[index] = item.checked ? 'stillChecked' : 'stillUnchecked';
                }
            }
        });

        currSec.items.forEach((item, index) => {
            if (itemAssignments[index]) return;

            const text = item.text.trim();
            const pool = prevItemsPool.get(text);
            if (pool && pool.length > 0) {
                const prevChecked = pool.shift()!;
                if (!prevChecked && item.checked) itemAssignments[index] = 'newlyChecked';
                else if (prevChecked && !item.checked) itemAssignments[index] = 'newlyUnchecked';
                else itemAssignments[index] = item.checked ? 'stillChecked' : 'stillUnchecked';
            }
        });

        currSec.items.forEach((item, index) => {
            if (itemAssignments[index]) return;
            itemAssignments[index] = item.checked ? 'stillChecked' : 'stillUnchecked';
        });

        currSec.items.forEach((item, index) => {
            const assignment = itemAssignments[index];
            if (assignment === 'stillUnchecked') stillUnchecked.push(item);
            else if (assignment === 'newlyUnchecked') newlyUnchecked.push(item);
            else if (assignment === 'stillChecked') stillChecked.push(item);
            else if (assignment === 'newlyChecked') newlyChecked.push(item);
        });

        const finalItems = [
            ...stillUnchecked,
            ...newlyUnchecked,
            ...(settings.checkedItemsPlacement === 'top'
                ? [...newlyChecked, ...stillChecked]
                : [...stillChecked, ...newlyChecked]),
        ];

        resultLines.push(...currSec.otherLines);
        resultLines.push(...finalItems.map((item) => item.originalLine));
    }

    return resultLines.join('\n');
}

describe('Shopping List Detection', () => {
    // Mocking minimal version of the logic in isShoppingList
    function isShoppingListMock(
        frontmatter: Record<string, unknown> | null | undefined,
        tags: string[],
    ): boolean {
        if (frontmatter?.['shopping-list'] === true || frontmatter?.['shopping-list'] === 'true') {
            return true;
        }
        if (tags && (tags.includes('#shopping-list') || tags.includes('shopping-list'))) {
            return true;
        }
        return false;
    }

    it('should identify a shopping list by frontmatter', () => {
        expect(isShoppingListMock({ 'shopping-list': true }, [])).toBe(true);
        expect(isShoppingListMock({ 'shopping-list': 'true' }, [])).toBe(true);
    });

    it('should identify a shopping list by tags', () => {
        expect(isShoppingListMock({}, ['#shopping-list'])).toBe(true);
        expect(isShoppingListMock({}, ['shopping-list'])).toBe(true);
    });

    it('should not identify as shopping list if metadata is missing', () => {
        expect(isShoppingListMock({}, [])).toBe(false);
        expect(isShoppingListMock({ other: true }, ['other'])).toBe(false);
    });
});

describe('Section Parsing', () => {
    it('should handle category with an empty line before items', () => {
        const content = `# Category

- [ ] Item 1`;
        const sections = parseSections(content);
        expect(sections.length).toBe(1);
        expect(sections[0].header).toBe('# Category');
        expect(sections[0].items.length).toBe(1);
        expect(sections[0].items[0].text).toBe('Item 1');
        expect(sections[0].otherLines).toContain('');
    });

    it('should handle category with no empty line before items', () => {
        const content = `# Category
- [ ] Item 1`;
        const sections = parseSections(content);
        expect(sections.length).toBe(1);
        expect(sections[0].header).toBe('# Category');
        expect(sections[0].items.length).toBe(1);
        expect(sections[0].items[0].text).toBe('Item 1');
    });

    it('should handle multiple categories', () => {
        const content = `# Cat 1
- [ ] A
# Cat 2
- [ ] B`;
        const sections = parseSections(content);
        expect(sections.length).toBe(2);
        expect(sections[0].header).toBe('# Cat 1');
        expect(sections[1].header).toBe('# Cat 2');
    });
});

describe('Shopping List Reordering', () => {
    const settings = { checkedItemsPlacement: 'end' as const };

    it('should keep a new item at the top even if a checked duplicate exists (The Fix)', () => {
        const prevContent = `# Section
- [ ] Eggs
- [x] Apples`;

        const currContent = `# Section
- [ ] Apples
- [ ] Eggs
- [x] Apples`;

        const prev = parseSections(prevContent);
        const curr = parseSections(currContent);
        const result = reorderSections(curr, prev, settings);

        // Expectation: Apples should still be at the top, not jumped to bottom of unchecked
        expect(result).toBe(`# Section
- [ ] Apples
- [ ] Eggs
- [x] Apples`);
    });

    it('should move newly checked items to the end of the section', () => {
        const prevContent = `# Section
- [ ] Eggs
- [ ] Apples`;

        const currContent = `# Section
- [x] Eggs
- [ ] Apples`;

        const prev = parseSections(prevContent);
        const curr = parseSections(currContent);
        const result = reorderSections(curr, prev, settings);

        expect(result).toBe(`# Section
- [ ] Apples
- [x] Eggs`);
    });

    it('should handle unchecking an item by moving it to the end of unchecked items', () => {
        const prevContent = `# Section
- [ ] Milk
- [x] Bread`;

        const currContent = `# Section
- [ ] Milk
- [ ] Bread`;

        const prev = parseSections(prevContent);
        const curr = parseSections(currContent);
        const result = reorderSections(curr, prev, settings);

        expect(result).toBe(`# Section
- [ ] Milk
- [ ] Bread`);
    });

    it('should respect settings.checkedItemsPlacement="top"', () => {
        const topSettings = { checkedItemsPlacement: 'top' as const };
        const prevContent = `# Section
- [ ] Milk
- [x] Bread`;

        const currContent = `# Section
- [x] Milk
- [x] Bread`;

        const prev = parseSections(prevContent);
        const curr = parseSections(currContent);
        const result = reorderSections(curr, prev, topSettings);

        // Milk was newly checked, so it should be at the top of checked items
        expect(result).toBe(`# Section
- [x] Milk
- [x] Bread`);
    });

    it('should preserve other lines like comments or empty lines', () => {
        const prevContent = `# Section
<!-- comment -->

- [ ] Eggs`;

        const currContent = `# Section
<!-- comment -->

- [x] Eggs`;

        const prev = parseSections(prevContent);
        const curr = parseSections(currContent);
        const result = reorderSections(curr, prev, settings);

        expect(result).toBe(`# Section
<!-- comment -->

- [x] Eggs`);
    });
});
