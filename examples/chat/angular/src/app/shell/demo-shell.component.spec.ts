import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LANGGRAPH_THREADS_CONFIG } from '@ngaf/langgraph';
import { DemoShell } from './demo-shell.component';
import { PalettePersistence } from './palette-persistence.service';

const THREADS_CONFIG = {
  provide: LANGGRAPH_THREADS_CONFIG,
  useValue: { apiUrl: 'http://localhost:2024', titleMetadataKey: 'title' },
};

describe('DemoShell — mode signal', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        THREADS_CONFIG,
        provideRouter([
          { path: 'embed', component: DemoShell },
          { path: 'popup', component: DemoShell },
          { path: 'sidebar', component: DemoShell },
          { path: '', pathMatch: 'full', redirectTo: 'embed' },
          { path: '**', redirectTo: 'embed' },
        ]),
      ],
    });
  });

  it('defaults to "embed" when URL is /', async () => {
    const fixture = TestBed.createComponent(DemoShell);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { mode: () => string };
    expect(cmp.mode()).toBe('embed');
  });

  it('resolves "popup" when navigating to /popup', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/popup');
    const fixture = TestBed.createComponent(DemoShell);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { mode: () => string };
    expect(cmp.mode()).toBe('popup');
  });

  it('falls back to "embed" for unknown segments', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/bogus');
    const fixture = TestBed.createComponent(DemoShell);
    fixture.detectChanges();
    const cmp = fixture.componentInstance as unknown as { mode: () => string };
    expect(cmp.mode()).toBe('embed');
  });
});

describe('DemoShell — toolbar layout', () => {
  it('no longer renders the "New conversation" button (removed for tightness)', () => {
    TestBed.configureTestingModule({
      providers: [
        THREADS_CONFIG,
        provideRouter([
          { path: 'embed', component: DemoShell },
          { path: '', pathMatch: 'full', redirectTo: 'embed' },
          { path: '**', redirectTo: 'embed' },
        ]),
      ],
    });
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    expect(fx.nativeElement.querySelector('.demo-shell__toolbar-action')).toBeNull();
  });

  it('renders fields without visible per-field labels (tighter toolbar)', () => {
    TestBed.configureTestingModule({
      providers: [
        THREADS_CONFIG,
        provideRouter([
          { path: 'embed', component: DemoShell },
          { path: '', pathMatch: 'full', redirectTo: 'embed' },
          { path: '**', redirectTo: 'embed' },
        ]),
      ],
    });
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const fields = fx.nativeElement.querySelectorAll('.demo-shell__field');
    expect(fields.length).toBe(4);
    for (const field of Array.from(fields) as HTMLElement[]) {
      // No <span> sibling labels remain inside fields.
      expect(field.querySelector(':scope > span')).toBeNull();
    }
  });
});

describe('DemoShell — toolbar dropdowns use chat-select', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        THREADS_CONFIG,
        provideRouter([
          { path: 'embed', component: DemoShell },
          { path: '', pathMatch: 'full', redirectTo: 'embed' },
          { path: '**', redirectTo: 'embed' },
        ]),
      ],
    });
  });

  it('renders the four toolbar fields with <chat-select>, not native <select>', () => {
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const fields = fx.nativeElement.querySelectorAll('.demo-shell__field');
    expect(fields.length).toBe(4);
    for (const field of Array.from(fields) as HTMLElement[]) {
      expect(field.querySelector('chat-select')).toBeTruthy();
      expect(field.querySelector('select')).toBeNull();
    }
  });
});

describe('DemoShell — threadId hydration', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        THREADS_CONFIG,
        provideRouter([
          { path: 'embed', component: DemoShell },
          { path: 'embed/:threadId', component: DemoShell },
          { path: '', pathMatch: 'full', redirectTo: 'embed' },
          { path: '**', redirectTo: 'embed' },
        ]),
      ],
    });
  });

  it('hydrates threadIdSignal from /embed/:threadId', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed/abc123');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const cmp = fx.componentInstance as unknown as { threadIdSignal: () => string | null };
    expect(cmp.threadIdSignal()).toBe('abc123');
  });

  it('leaves threadIdSignal null when route has no :threadId', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const cmp = fx.componentInstance as unknown as { threadIdSignal: () => string | null };
    expect(cmp.threadIdSignal()).toBeNull();
  });
});

describe('DemoShell — mode change preserves thread + query', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        THREADS_CONFIG,
        provideRouter([
          { path: 'embed', component: DemoShell },
          { path: 'embed/:threadId', component: DemoShell },
          { path: 'popup', component: DemoShell },
          { path: 'popup/:threadId', component: DemoShell },
          { path: '', pathMatch: 'full', redirectTo: 'embed' },
          { path: '**', redirectTo: 'embed' },
        ]),
      ],
    });
  });

  it('preserves :threadId and ?model when switching mode', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed/abc?model=gpt-5-nano');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const cmp = fx.componentInstance as unknown as { onModeChange: (m: string) => void };
    cmp.onModeChange('popup');
    await fx.whenStable();
    expect(router.url).toBe('/popup/abc?model=gpt-5-nano');
  });
});

describe('DemoShell — thread switch navigates URL', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        THREADS_CONFIG,
        provideRouter([
          { path: 'embed', component: DemoShell },
          { path: 'embed/:threadId', component: DemoShell },
          { path: '', pathMatch: 'full', redirectTo: 'embed' },
          { path: '**', redirectTo: 'embed' },
        ]),
      ],
    });
  });

  it('navigates to /embed/<id> when onThreadSelected fires', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const cmp = fx.componentInstance as unknown as {
      onThreadSelected: (id: string) => void;
    };
    cmp.onThreadSelected('xyz');
    await fx.whenStable();
    expect(router.url).toBe('/embed/xyz');
  });
});

describe('DemoShell — knob hydration from URL', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        THREADS_CONFIG,
        provideRouter([
          { path: 'embed', component: DemoShell },
          { path: 'embed/:threadId', component: DemoShell },
          { path: '', pathMatch: 'full', redirectTo: 'embed' },
          { path: '**', redirectTo: 'embed' },
        ]),
      ],
    });
  });

  it('hydrates model + effort from query params on mount', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed?model=gpt-5-nano&effort=high');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const cmp = fx.componentInstance as unknown as {
      model: () => string;
      effort: () => string;
    };
    expect(cmp.model()).toBe('gpt-5-nano');
    expect(cmp.effort()).toBe('high');
  });

  it('hydrates genUiMode from ?genui param', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed?genui=json-render');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const cmp = fx.componentInstance as unknown as { genUiMode: () => string };
    expect(cmp.genUiMode()).toBe('json-render');
  });

  it('hydrates colorScheme from ?color=light', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed?color=light');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const cmp = fx.componentInstance as unknown as { colorScheme: () => string };
    expect(cmp.colorScheme()).toBe('light');
  });

  it('ignores invalid ?color values', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed?color=purple');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const cmp = fx.componentInstance as unknown as { colorScheme: () => string };
    // Default is 'dark' — invalid value must not override it
    expect(cmp.colorScheme()).toBe('dark');
  });

  it('hydrates selectedProjectId from ?project param', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed?project=proj-42');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const cmp = fx.componentInstance as unknown as { selectedProjectId: () => string | null };
    expect(cmp.selectedProjectId()).toBe('proj-42');
  });
});

describe('DemoShell — knob URL writes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        THREADS_CONFIG,
        provideRouter([
          { path: 'embed', component: DemoShell },
          { path: 'embed/:threadId', component: DemoShell },
          { path: '', pathMatch: 'full', redirectTo: 'embed' },
          { path: '**', redirectTo: 'embed' },
        ]),
      ],
    });
  });

  it('writes ?model=gpt-5-nano when model changes off default', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const cmp = fx.componentInstance as unknown as { onModelChange: (m: string) => void };
    cmp.onModelChange('gpt-5-nano');
    await fx.whenStable();
    expect(router.url).toBe('/embed?model=gpt-5-nano');
  });

  it('omits ?model when changing back to the default', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed?model=gpt-5-nano');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const cmp = fx.componentInstance as unknown as { onModelChange: (m: string) => void };
    cmp.onModelChange('gpt-5-mini');
    await fx.whenStable();
    expect(router.url).toBe('/embed');
  });
});

describe('DemoShell — ephemeral hydration', () => {
  let writes: Array<[string, unknown]>;

  beforeEach(() => {
    writes = [];
    const fake = {
      read: (_key: string) => null,
      write: (key: string, value: unknown) => { writes.push([key, value]); },
    };
    TestBed.configureTestingModule({
      providers: [
        THREADS_CONFIG,
        provideRouter([
          { path: 'embed', component: DemoShell },
          { path: 'embed/:threadId', component: DemoShell },
          { path: '', pathMatch: 'full', redirectTo: 'embed' },
          { path: '**', redirectTo: 'embed' },
        ]),
        { provide: PalettePersistence, useValue: fake },
      ],
    });
  });

  it('does NOT write to persistence when knobs hydrate from URL', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed/abc?model=gpt-5-nano&theme=material-dark');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    expect(writes.find(([k]) => k === 'model')).toBeUndefined();
    expect(writes.find(([k]) => k === 'theme')).toBeUndefined();
    expect(writes.find(([k]) => k === 'threadId')).toBeUndefined();
  });

  it('DOES write to persistence on explicit user action', async () => {
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/embed');
    const fx = TestBed.createComponent(DemoShell);
    fx.detectChanges();
    const cmp = fx.componentInstance as unknown as { onThemeChange: (t: string) => void };
    cmp.onThemeChange('material-dark');
    expect(writes.find(([k, v]) => k === 'theme' && v === 'material-dark')).toBeDefined();
  });
});
