declare namespace JSX {
  interface IntrinsicElements {
    'stream-chat-demo': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      'api-url'?: string;
      'assistant-id'?: string;
    };
  }
}
