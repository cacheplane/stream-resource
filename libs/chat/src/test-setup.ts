// SPDX-License-Identifier: MIT
import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import { DebugElement } from '@angular/core';

getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting(),
  { teardown: { destroyAfterEach: true } },
);

// Angular 21's DebugElement.queryAll only traverses element nodes and misses
// ng-template comment nodes whose directives live in DebugNode.childNodes.
// Extend queryAll to also include DebugNode matches so directive-on-ng-template
// specs can use the injector-predicate pattern.
const _origQueryAll = DebugElement.prototype.queryAll;
DebugElement.prototype.queryAll = function (predicate: (de: DebugElement) => boolean) {
  const elementMatches: DebugElement[] = _origQueryAll.call(this, predicate);
  const nodeMatches = this.queryAllNodes(predicate as any)
    .filter((n): n is DebugElement => !(n instanceof DebugElement) && typeof (n as any).injector !== 'undefined');
  // Merge without duplicates: nodeMatches entries are not DebugElement so no overlap
  return [...elementMatches, ...(nodeMatches as unknown as DebugElement[])];
};
