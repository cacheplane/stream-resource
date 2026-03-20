import { platformBrowser } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { ChatDemoModule } from './app/chat-demo/chat-demo.module';

@NgModule({ imports: [ChatDemoModule] })
class AppModule {}

platformBrowser().bootstrapModule(AppModule);
