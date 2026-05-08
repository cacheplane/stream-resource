// SPDX-License-Identifier: MIT
import { InjectionToken, Signal } from '@angular/core';
import type { LangGraphAgent } from '@ngaf/langgraph';

/**
 * Shared agent provided by `DemoShell` and consumed by routed mode
 * components. Created once per shell mount; survives mode navigations
 * because the router never unmounts the shell.
 */
export const DEMO_AGENT = new InjectionToken<LangGraphAgent>('DEMO_AGENT');

/**
 * Writable signal carrying the currently-selected model. `DemoShell`
 * owns the source of truth; mode components can read it via two-way
 * binding into `<chat>` / `<chat-popup>` / `<chat-sidebar>`.
 */
export const DEMO_MODEL = new InjectionToken<Signal<string>>('DEMO_MODEL');
