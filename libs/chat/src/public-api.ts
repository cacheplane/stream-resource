// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0

// Shared types
export type { ChatConfig, MessageTemplateType } from './lib/chat.types';

// Primitives
export { ChatMessagesComponent } from './lib/primitives/chat-messages/chat-messages.component';
export { MessageTemplateDirective } from './lib/primitives/chat-messages/message-template.directive';
export { getMessageType } from './lib/primitives/chat-messages/chat-messages.component';

// Test utilities
export { createMockStreamResourceRef } from './lib/testing/mock-stream-resource-ref';
