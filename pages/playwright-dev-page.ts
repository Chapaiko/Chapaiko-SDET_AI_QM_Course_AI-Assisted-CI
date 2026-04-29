import { type Locator, type Page } from '@playwright/test';

export class PlaywrightDevPage {
  readonly page: Page;
  readonly getStartedLink: Locator;
  readonly installationHeading: Locator;

  // Main navigation locators — scoped to the semantic ARIA landmark
  readonly navbar: Locator;
  readonly navDocsLink: Locator;
  readonly navApiLink: Locator;

  // Footer community locators
  readonly footerCommunityLabel: Locator;
  readonly footerDiscordLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getStartedLink = page.getByRole('link', { name: 'Get started' });
    this.installationHeading = page.getByRole('heading', { name: 'Installation' });

    // Semantic ARIA landmark — stable across CSS/class renames
    this.navbar = page.getByRole('navigation', { name: 'Main' });
    this.navDocsLink = this.navbar.getByRole('link', { name: 'Docs', exact: true });
    this.navApiLink = this.navbar.getByRole('link', { name: 'API', exact: true });

    // Community is in the footer section (not the navbar)
    const footer = page.getByRole('contentinfo');
    this.footerCommunityLabel = footer.getByText('Community', { exact: true });
    this.footerDiscordLink = footer.getByRole('link', { name: 'Discord', exact: true });
  }

  async goto() {
    await this.page.goto('/');
  }

  async clickGetStarted() {
    await this.getStartedLink.click();
  }
}
