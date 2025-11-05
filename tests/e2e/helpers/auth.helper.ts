import { Page } from '@playwright/test';

export interface UserCredentials {
  email: string;
  password: string;
  name?: string;
  phone?: string;
}

export class AuthHelper {
  constructor(private page: Page) {}

  async login(credentials: UserCredentials) {
    await this.page.goto('/login');
    await this.page.fill('input[type="email"]', credentials.email);
    await this.page.fill('input[type="password"]', credentials.password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL('/');
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/login');
  }

  async signUp(credentials: UserCredentials) {
    await this.page.goto('/signup');

    if (credentials.name) {
      await this.page.fill('input[name="name"]', credentials.name);
    }

    await this.page.fill('input[type="email"]', credentials.email);
    await this.page.fill('input[type="password"]', credentials.password);

    if (credentials.phone) {
      await this.page.fill('input[type="tel"]', credentials.phone);
    }

    await this.page.click('button[type="submit"]');
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}
