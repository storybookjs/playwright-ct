import { describe, it, expect, vi } from 'vitest';
import babel from '@babel/core';
import dedent from 'ts-dedent';
import plugin from './ct-test-plugin';

vi.mock('./global-setup.cjs', () => {
  return {
    lookupTitle: () => 'lookup-title',
  };
});

describe('csf-playwright-plugin', () => {
  it('story id', () => {
    const input = dedent`
      import { test, expect } from '../src/ct';
      import * as PageStories from '../src/stories/Page.stories';
      
      test('login', async ({ mount }) => {
        const page = await mount('example-page--logged-out');
        const login = await page.getByRole('button', { name: 'Log in' });
      });
    `;
    const result = babel.transform(input, { plugins: [plugin] });
    expect(result?.code).toMatchInlineSnapshot(`
      "import { test, expect } from '../src/ct';
      ;
      test('login', async ({
        mount
      }) => {
        const page = await mount('example-page--logged-out');
        const login = await page.getByRole('button', {
          name: 'Log in'
        });
      });"
    `);
  });

  it('stories export', () => {
    const input = dedent`
      import { test, expect } from '../src/ct';
      import * as PageStories from '../src/stories/Page.stories';
      
      test('login', async ({ mount }) => {
        const page = await mount(PageStories.LoggedOut);
        const login = await page.getByRole('button', { name: 'Log in' });
      });
    `;
    const result = babel.transform(input, { plugins: [plugin] });
    expect(result?.code).toMatchInlineSnapshot(`
      "import { test, expect } from '../src/ct';
      ;
      test('login', async ({
        mount
      }) => {
        const page = await mount(\\"lookup-title--logged-out\\");
        const login = await page.getByRole('button', {
          name: 'Log in'
        });
      });"
    `);
  });

  it('story export', () => {
    const input = dedent`
        import { test, expect } from '../src/ct';
        import { LoggedOut } from '../src/stories/Page.stories';
        
        test('login', async ({ mount }) => {
          const page = await mount(LoggedOut);
          const login = await page.getByRole('button', { name: 'Log in' });
        });
      `;
    const result = babel.transform(input, { plugins: [plugin] });
    expect(result?.code).toMatchInlineSnapshot(`
      "import { test, expect } from '../src/ct';
      ;
      test('login', async ({
        mount
      }) => {
        const page = await mount(\\"lookup-title--logged-out\\");
        const login = await page.getByRole('button', {
          name: 'Log in'
        });
      });"
    `);
  });
});
