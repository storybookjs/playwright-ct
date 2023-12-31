/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { join } from 'path';
import type {
  Fixtures,
  Locator,
  Page,
  BrowserContextOptions,
  PlaywrightTestArgs,
  PlaywrightTestOptions,
  PlaywrightWorkerArgs,
  PlaywrightWorkerOptions,
  PlaywrightTestConfig,
  BrowserContext,
} from '@playwright/test';
import type { Channel } from '@storybook/channels';
import type { Args } from '@storybook/types';
import {
  test as baseTest,
  expect,
  devices,
  defineConfig as baseDefineConfig,
} from '@playwright/test';

type StoryId = string;
type ModuleExport = unknown;
type StoryOrExport = StoryId | ModuleExport;
interface MountResult extends Locator {}

let boundCallbacksForMount: Function[] = [];

declare global {
  let __STORYBOOK_ADDONS_CHANNEL__: Channel;
}

const fixtures: Fixtures<
  PlaywrightTestArgs &
    PlaywrightTestOptions & {
      mount: (storyId: StoryOrExport, args?: Args) => Promise<MountResult>;
    },
  PlaywrightWorkerArgs &
    PlaywrightWorkerOptions & { _ctWorker: { context: BrowserContext | undefined; hash: string } },
  {
    _contextFactory: (options?: BrowserContextOptions) => Promise<BrowserContext>;
    _contextReuseMode: string;
  }
> = {
  _contextReuseMode: 'when-possible',

  serviceWorkers: 'block',

  _ctWorker: [{ context: undefined, hash: '' }, { scope: 'worker' }],

  page: async ({ page }, use) => {
    await (page as any)._wrapApiCall(async () => {
      await page.exposeFunction('__ct_dispatch', (ordinal: number, args: any[]) => {
        boundCallbacksForMount[ordinal](...args);
      });
    }, true);
    await use(page);
  },

  mount: async ({ page }, use, info) => {
    await use(async (storyId: StoryOrExport, args?: Args) => {
      boundCallbacksForMount = [];
      if (args) wrapFunctions(args, page, boundCallbacksForMount);

      if (typeof storyId !== 'string') return {} as MountResult;

      const config = (info as any)._configInternal.config as PlaywrightTestConfig;
      if (!config?.webServer) throw new Error('webServer config is missing');
      const server = Array.isArray(config.webServer) ? config.webServer[0] : config.webServer;
      const url = server.url || `http://localhost:${server.port}`;

      await page.goto(join(url, 'iframe.html'));

      await page.evaluate(
        async ({ storyId, args }) => {
          const channel = __STORYBOOK_ADDONS_CHANNEL__;
          /**
           * Perform a function that updates the story store and wait for the story to render
           * or error
           */
          const waitForStoryRender = async (updateFn: () => void) =>
            new Promise((resolve, reject) => {
              channel.once('storyRendered', () => resolve(void 0));
              channel.once('storyUnchanged', () => resolve(void 0));
              channel.once('storyErrored', (error) => reject(error));
              channel.once('storyThrewException', (error) => reject(error));
              channel.once('playFunctionThrewException', (error) => reject(error));
              channel.once('storyMissing', (id) => id === storyId && reject(`Missing story ${id}`));
              updateFn();
            });

          const unwrapFunctions = (object: any) => {
            for (const [key, value] of Object.entries(object)) {
              if (typeof value === 'string' && (value as string).startsWith('__pw_func_')) {
                const ordinal = +value.substring('__pw_func_'.length);
                object[key] = (...args: any[]) => {
                  (window as any)['__ct_dispatch'](ordinal, args);
                };
              } else if (typeof value === 'object' && value) {
                unwrapFunctions(value);
              }
            }
          };

          await waitForStoryRender(() =>
            channel.emit('setCurrentStory', { storyId, viewMode: 'story' })
          );
          if (args) {
            unwrapFunctions(args);
            const updatedArgs = args;
            await waitForStoryRender(() => {
              channel.emit('updateStoryArgs', {
                storyId,
                updatedArgs,
              });
            });
          }
        },
        { storyId, args }
      );
      return page.locator('#storybook-root');
    });
  },
};

function wrapFunctions(object: any, page: Page, callbacks: Function[]) {
  for (const [key, value] of Object.entries(object)) {
    const type = typeof value;
    if (type === 'function') {
      const functionName = '__pw_func_' + callbacks.length;
      callbacks.push(value as Function);
      object[key] = functionName;
    } else if (type === 'object' && value) {
      wrapFunctions(value, page, callbacks);
    }
  }
}

const defineConfig = (config: PlaywrightTestConfig) =>
  baseDefineConfig({
    globalSetup: join(__dirname, 'global-setup.js'),
    ...config,
    build: {
      // @ts-expect-error WTH
      babelPlugins: [...(config.build?.babelPlugins || []), [join(__dirname, 'ct-test-plugin.js')]],
      // @ts-expect-error WTH
      external: [/playwright-ct\/.*.js$/],
      ...config.build,
    },
    webServer: {
      command: 'npm run storybook',
      url: 'http://localhost:6006',
      reuseExistingServer: true,
      ...config.webServer,
    },
  });

// @ts-expect-error WTH
const test = baseTest.extend(fixtures);

export { test, expect, devices, defineConfig };
