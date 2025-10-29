/**
 * Type declarations for @github/markdown-toolbar-element
 * Web Components for markdown formatting buttons
 */

declare namespace JSX {
    interface IntrinsicElements {
        'markdown-toolbar': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
            for?: string;
        }, HTMLElement>;
        'md-bold': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        'md-italic': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        'md-code': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        'md-link': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        'md-header': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & {
            'data-md-header'?: string;
        }, HTMLElement>;
        'md-unordered-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        'md-ordered-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        'md-code-block': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        'md-quote': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        'md-image': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        'md-task-list': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        'md-mention': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
        'md-ref': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
}
