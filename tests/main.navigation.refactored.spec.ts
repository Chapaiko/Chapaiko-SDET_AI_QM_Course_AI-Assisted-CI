/**
 * Test case: Main Page Navigation Buttons — Docs, API, Community
 *
 * Requirement: The main page should expose navigation for Docs, API, and Community
 * — each visible, accessible by role and name, and navigating correctly.
 *
 * Site audit (2026-04-28):
 *   - "Docs" and "API" are links inside the primary navbar
 *     (ARIA landmark: navigation / name="Main").
 *   - "Community" is no longer a navbar link. It exists as a visible labelled section
 *     in the page footer, grouping Discord, Stack Overflow, Twitter, and LinkedIn.
 *   - Each test below covers the requirement item at the location where it actually
 *     lives, with an inline note where the location differs from a top-level nav button.
 */

import { expect, test, type Locator, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Page model — scoped to this spec only.
// Replaces PlaywrightDevPage to avoid mixed-responsibility POM (see analysis).
// ---------------------------------------------------------------------------

class PlaywrightMainPage {
  readonly mainNav: Locator;
  readonly footer: Locator;

  constructor(readonly page: Page) {
    // Semantic ARIA landmark — more stable than nav[class*="navbar"]
    this.mainNav = page.getByRole('navigation', { name: 'Main' });
    // Footer landmark for Community section
    this.footer = page.getByRole('contentinfo');
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.mainNav).toBeVisible();
  }

  /** Role-based link lookup inside the primary navbar — no ID or CSS hacks. */
  navLink(name: string): Locator {
    return this.mainNav.getByRole('link', { name, exact: true });
  }

  /** The "Community" text label in the footer. */
  footerCommunityLabel(): Locator {
    return this.footer.getByText('Community', { exact: true });
  }

  /** A named link inside the footer Community section. */
  footerCommunityLink(name: string): Locator {
    return this.footer.getByRole('link', { name, exact: true });
  }
}

// ---------------------------------------------------------------------------
// Data table — add new nav items here without touching test bodies.
// ---------------------------------------------------------------------------

// destinationUrl is derived from href at assertion time — single source of truth, no silent desync.
type NavLinkExpectation = {
  label: 'Docs' | 'API';
  href: string;
  destinationHeading: string;
};

const navLinkExpectations: NavLinkExpectation[] = [
  {
    label: 'Docs',
    href: '/docs/intro',
    destinationHeading: 'Installation',
  },
  {
    label: 'API',
    href: '/docs/api/class-playwright',
    destinationHeading: 'Playwright Library',
  },
];

// ---------------------------------------------------------------------------
// Shared helper — DRY visibility + href contract assertion.
// ---------------------------------------------------------------------------

// Returns the resolved Locator so callers can reuse it without a second lookup.
async function assertNavLink(
  home: PlaywrightMainPage,
  label: string,
  href: string,
): Promise<Locator> {
  const link = home.navLink(label);
  await expect(link, `"${label}" should be visible in the main navigation`).toBeVisible();
  await expect(link, `"${label}" should point to the expected href`).toHaveAttribute('href', href);
  return link;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Main page navigation buttons: Docs, API, Community', () => {
  // '!' asserts home is always set by beforeEach before any test body runs.
  let home!: PlaywrightMainPage;

  test.beforeEach(async ({ page }) => {
    home = new PlaywrightMainPage(page);
    await home.goto();
  });

  // --- Docs and API: parameterised ---

  for (const { label, href, destinationHeading } of navLinkExpectations) {
    test(`${label} — visible, href verified, role+name accessible, navigates correctly`, async ({ page }) => {
      // Capture the resolved locator so the click step reuses it without a second lookup.
      let link!: Locator;

      await test.step(`Verify "${label}" is visible and has the correct href`, async () => {
        link = await assertNavLink(home, label, href);
      });

      await test.step(`Click "${label}" and verify the destination`, async () => {
        await link.click();
        // Derived from href — keeps URL pattern and data table in sync automatically.
        await expect(page, `URL should match the ${label} destination`).toHaveURL(new RegExp(href));
        await expect(
          page.getByRole('heading', { name: destinationHeading, exact: true }),
          `Destination page should show the "${destinationHeading}" heading`,
        ).toBeVisible();
      });
    });
  }

  // --- Community: footer section ---

  test(
    'Community — section visible and community links accessible',
    async () => {
      // Community was moved from the navbar to the footer in a site redesign.
      test.info().annotations.push({
        type: 'Note',
        description: 'Community section is located in the page footer, not the primary navbar',
      });

      await test.step('Verify the Community label is visible on the page', async () => {
        await expect(
          home.footerCommunityLabel(),
          '"Community" label should be visible in the page footer',
        ).toBeVisible();
      });

      await test.step('Verify the Discord community link is accessible and correctly targeted', async () => {
        const discord = home.footerCommunityLink('Discord');
        await expect(discord, 'Discord link should be visible under Community').toBeVisible();
        await expect(discord, 'Discord link should point to the Playwright Discord').toHaveAttribute(
          'href',
          'https://aka.ms/playwright/discord',
        );
      });
    },
  );
});

// ---------------------------------------------------------------------------
// Suite 2 — Accessibility: ARIA contract
// Addresses the gap identified in refactoring-summary.md (Version 2 → Version 3):
// functional tests pass through broken ARIA roles, missing accessible names, and
// AT-hidden focusable elements. This suite makes those failures explicit.
// ---------------------------------------------------------------------------

test.describe('Accessibility: Main page navigation ARIA contract', () => {
  // '!' asserts home is always set by beforeEach before any test body runs.
  let home!: PlaywrightMainPage;

  test.beforeEach(async ({ page }) => {
    home = new PlaywrightMainPage(page);
    await home.goto();
  });

  test('Primary navbar is exposed as a "navigation" landmark with an accessible name', async () => {
    await test.step('Verify the navbar has ARIA role "navigation"', async () => {
      // WCAG 1.3.1 / 4.1.2 — landmark role must be correct for AT navigation
      await expect(
        home.mainNav,
        'Navbar should have ARIA role "navigation"',
      ).toHaveRole('navigation');
    });

    await test.step('Verify the navbar has accessible name "Main"', async () => {
      // WCAG 4.1.2 — multiple nav landmarks must be distinguishable by accessible name
      await expect(
        home.mainNav,
        'Navbar accessible name should be "Main" so screen readers can distinguish it',
      ).toHaveAccessibleName('Main');
    });
  });

  test('Footer is exposed as a "contentinfo" landmark', async () => {
    await test.step('Verify the footer has ARIA role "contentinfo"', async () => {
      await expect(
        home.footer,
        'Footer should have ARIA role "contentinfo"',
      ).toHaveRole('contentinfo');
    });
  });

  for (const { label } of navLinkExpectations) {
    test(`"${label}" nav link — correct ARIA role, accessible name, and not hidden from AT`, async () => {
      const link = home.navLink(label);

      await test.step(`Verify "${label}" has ARIA role "link"`, async () => {
        // WCAG 4.1.2 — element must expose the correct role to assistive technology
        await expect(link, `"${label}" should have ARIA role "link"`).toHaveRole('link');
      });

      await test.step(`Verify "${label}" has an accessible name`, async () => {
        // WCAG 2.4.6 — catches icon-only links where the AT would read a raw URL
        await expect(
          link,
          `"${label}" should have accessible name "${label}"`,
        ).toHaveAccessibleName(label);
      });

      await test.step(`Verify "${label}" is not hidden from assistive technology`, async () => {
        // WCAG 4.1.2 — focusable elements must not be removed from the AT tree
        await expect(
          link,
          `"${label}" must not have aria-hidden="true"`,
        ).not.toHaveAttribute('aria-hidden', 'true');
      });
    });
  }

  test('Discord community link — correct ARIA role, accessible name, and not hidden from AT', async () => {
    const discord = home.footerCommunityLink('Discord');

    await test.step('Verify Discord link has ARIA role "link"', async () => {
      await expect(discord, 'Discord link should have ARIA role "link"').toHaveRole('link');
    });

    await test.step('Verify Discord link has accessible name "Discord"', async () => {
      // Catches icon-only link regressions where AT reads the raw URL
      await expect(
        discord,
        'Discord link should have accessible name "Discord"',
      ).toHaveAccessibleName('Discord');
    });

    await test.step('Verify Discord link is not hidden from assistive technology', async () => {
      await expect(
        discord,
        'Discord link should not have aria-hidden="true"',
      ).not.toHaveAttribute('aria-hidden', 'true');
    });
  });
});
