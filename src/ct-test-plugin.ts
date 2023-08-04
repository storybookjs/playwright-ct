import { resolve, dirname } from 'path';
import type * as T from '@babel/types';
import type { PluginObj, PluginPass } from '@babel/core';
import { storyNameFromExport, toId } from '@storybook/csf';
import { lookupTitle } from './global-setup';

type BabelTypes = typeof T;
const STORIES_REGEX = /(story|stories)(\..*)?$/;

interface StoryImport {
  exportName?: string;
  path: string;
}

interface CustomState extends PluginPass {
  storyImports?: Record<string, StoryImport>;
}

const findImport = (storyImports: Record<string, StoryImport>, name: string): StoryImport => {
  const storyImport = storyImports[name];
  if (!storyImport) {
    throw new Error(`Could not find story import for ${name}`);
  }
  return storyImport;
};

export default function (babelContext: { types: BabelTypes }): PluginObj {
  const { types: t } = babelContext;
  return {
    visitor: {
      Program: {
        enter(_path, state) {
          state.storyImports = {};
        },
      },
      ImportDeclaration: {
        enter(path, state: CustomState) {
          if (t.isStringLiteral(path.node.source) && STORIES_REGEX.test(path.node.source.value)) {
            path.node.specifiers.forEach((specifier) => {
              const storyImport: StoryImport = { path: path.node.source.value };
              if (t.isImportSpecifier(specifier)) {
                const { imported } = specifier;
                storyImport.exportName = t.isIdentifier(imported) ? imported.name : imported.value;
              }

              state.storyImports![specifier.local.name] = storyImport;
            });
            path.replaceWith(t.emptyStatement());
          }
        },
      },
      CallExpression: {
        enter(path, state: CustomState) {
          if (
            t.isIdentifier(path.node.callee) &&
            path.node.callee.name === 'mount' &&
            path.node.arguments.length >= 1 &&
            !t.isStringLiteral(path.node.arguments[0])
          ) {
            const arg0 = path.node.arguments[0];
            let exportName;
            let importPath;
            if (t.isIdentifier(arg0)) {
              const storyImport = findImport(state.storyImports!, arg0.name);
              exportName = storyImport.exportName;
              importPath = storyImport.path;
            } else if (
              t.isMemberExpression(arg0) &&
              t.isIdentifier(arg0.object) &&
              t.isIdentifier(arg0.property)
            ) {
              exportName = arg0.property.name;
              const storyImport = findImport(state.storyImports!, arg0.object.name);
              importPath = storyImport.path;
            }
            if (exportName && importPath) {
              const storyPath = resolve(dirname(state.filename), importPath);
              const title = lookupTitle(storyPath);
              path.node.arguments[0] = t.stringLiteral(
                toId(title, storyNameFromExport(exportName))
              );
            } else {
              throw new Error(`Could not find story import for ${arg0}`);
            }
          }
        },
      },
    },
  };
}
