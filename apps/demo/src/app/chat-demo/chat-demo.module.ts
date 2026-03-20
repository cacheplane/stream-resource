import { NgModule, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { createCustomElement } from '@angular/elements';
import { ChatDemoComponent } from './chat-demo.component';

@NgModule({
  declarations: [ChatDemoComponent],
  imports: [CommonModule],
})
export class ChatDemoModule {
  constructor(private injector: Injector) {
    const el = createCustomElement(ChatDemoComponent, { injector: this.injector });
    customElements.define('stream-chat-demo', el);
  }
}
