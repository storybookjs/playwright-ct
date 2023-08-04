# Playwright CT Storybook

Test Storybook-rendered components in isolation using `@playwright/test`.

- Experimental package not intended for production use.
- Design / implementation borrows heavily from Playwright CT.

## Introduction

Given a [Storybook](https://storybook.js.org) story (component use case):

```ts
// Button.stories.ts
import { Button } from './Button';
export default { component: Button };
export const Primary = { args: { label: 'Button', primary: true } };
```

CT Storybook allows you to write a Playwright test against that story using all of the Playwright's features:

```ts
// Button.spec.ts
import { test, expect } from 'playwright-ct-storybook';
import * as ButtonStories from './Button.stories';

test('interacts', async ({ mount }) => {
  let count = 0;
  const button = await mount(ButtonStories.Primary, {
    onClick: () => {
      count += 1;
    },
  });
  await button.click();
  await expect(count).toBe(1);
});
```

Behind the scenes, this example:

1. Runs Storybook
2. Navigates to the story
3. Overrides the Button's `onClick` handler
4. Clicks on the button
5. Asserts the outcome

## Comparison to Playwright CT

Playwright CT is Playwright's recommended way to test components in isolation. Here is the same example in Playwright CT for React:

```ts
// Button.spec.ts
import { test, expect } from '@playwright/experimental-ct-react';
import Button from './Button';

test('interacts', async ({ mount }) => {
  let count = 0;
  const button = await mount(
    <Button
      label="Button"
      primary
      onClick={() => {
        count += 1;
      }}
    />
  );
  await button.click();
  await expect(count).toBe(1);
});
```

There are a few key differences here:

| Playwright CT React                       | Playwright CT Storybook                                      |
| ----------------------------------------- | ------------------------------------------------------------ |
| Renders component(s)                      | Renders story                                                |
| Specifies props in test                   | Specifies props in story, can override in test               |
| Renders in CT dev server                  | Renders in Storybook dev server                              |
| Compatible with Vite                      | Compatible with Vite, Webpack, Rspack, etc.                  |
| Compatible with React, Solid, Svelte, Vue | Compatible with CT renderers + Angular, Web components, Qwik |
| Limitations on props, imports             | No known limitations                                         |

Playwright CT lacks the concept of stories, so the tests render the components directly. This has the benefit of being able to see the component setup and test all in one place, but leads to some limitations due to the fact that the test file is mixing Node and Browser code in a single file.

You should consider using Playwright CT Storybook over Playwright CT if:

- You already use Storybook for component development and documentation
- You're using a renderer that is not supported by Playwright CT (e.g. Angular)
- You're hitting up against any of the limitations of CT (e.g. test imports)

## Comparison to Storybook CT

Storybook also provides component testing with its [Test Runner](https://storybook.js.org/docs/react/writing-tests/test-runner) (that also uses Playwright under the hood).

Here's the same example using Storybook's play function:

```ts
// Button.stories.ts
import { within, userEvent } from '@storybook/testing-library';
import { expect } from '@storybook/jest';

import { Button } from './Button';
export default { component: Button }

let count = 0;
export const Interaction {
  args: { label: 'Button', primary: true, onClick: () => { count += 1 } },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));
    await expect(count).toBe(1);
  }
}
```

| Storybook CT                             | Playwright CT Storybook                         |
| ---------------------------------------- | ----------------------------------------------- |
| Tests run in the browser                 | Tests run in node                               |
| Runs play function                       | Runs play function if present AND test function |
| Share & debug test in the browser        | Run and debug test in Playwright UI / debugger  |
| No need to write extra tests             | Write a test alongside your story as needed     |
| Interact using Testing Library           | Interact using all of Playwright facilities     |
| Compatible with Chromatic & SB ecosystem | Incompatible                                    |

The main difference between Storybook CT and Playwright CT is that Storybook's play functions are entirely browser-based. This means that you can publish and inspect your tests in a static build of Storybook in the cloud, which is great for collaboration debugging CI failures. The drawback of this approach is that some of Playwright's features, such as the ability to wait for network idle, are not unavailble in "user-land" browser code.

You should use Playwright CT Storybook over Storybook CT if:

- You prefer Playwright's test syntax
- You prefer Playwright's workflow (UI, debugger, etc)
- You need Playwright's richer facilities for interacting with the browser such as:
  - wait for network idle
  - truly force element pseudostates
  - evaluate arbitrary test code in the browser

## Installation and setup

Assuming you have a project that already uses Storybook.

First install Playwright:

```sh
npm init playwright@latest
```

Then install this package:

```sh
npm install playwright-ct-storybook
```

Then update your Playwright config to use `playwright-ct-storybook`'s `defineConfig`:

```diff
- import { defineConfig, devices } from '@playwright/test';
+ import { defineConfig, devices } from 'playwright-ct-storybook';
```

This is a thin wrapper around Playwright's `defineConfig` that tells Playwright to run against your Storybook dev server.

Finally you can write your first test based on your existing stories:

```js
import { test, expect } from 'playwright-ct-storybook';
import * as ButtonStories from './Button.stories';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test('renders', async ({ mount }) => {
  const button = await mount(ButtonStories.Primary);
  await expect(button).toContainText('Button');
});
```

To execute the test run:

```
npm run playwright
```

This will execute the

## TODO

- [ ] Dev server URL is hard-coded
- [ ] `beforeMount` / `afterMount` hooks unimplemented
- [ ] How to use this alongside play function
- [ ] How to use this alongside Playwright E2E
