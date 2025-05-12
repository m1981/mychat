import { describe, it, expect, vi } from 'vitest';
import { render, screen, RenderResult } from '@testing-library/react';
import ContentView from '../ContentView';

// Mock the CodeBlock component
vi.mock('../../CodeBlock', () => ({
  default: ({ lang, codeChildren }: { lang: string; codeChildren: React.ReactNode }) => (
    <div data-testid="code-block" data-lang={lang}>
      {codeChildren}
    </div>
  ),
}));

// Mock the MermaidDiagram component
vi.mock('@components/Chat/ChatContent/Message/MermaidComponent', () => ({
  default: ({ content }: { content: string }) => (
    <div data-testid="mermaid-diagram">{content}</div>
  ),
}));

// Helper function to reduce duplication
const renderContentView = (content: string): RenderResult => {
  return render(<ContentView content={content} />);
};

describe('ContentView', () => {
  // GIVEN markdown content with headings and formatting
  // WHEN the component is rendered
  // THEN it should display the content with proper formatting
  it('renders markdown content correctly', () => {
    const content = '# Heading\n\nThis is a paragraph with **bold** and *italic* text.';
    renderContentView(content);
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Heading');
    expect(screen.getByText(/This is a paragraph/)).toBeInTheDocument();
    expect(screen.getByText('bold')).toHaveStyle('font-weight: bold');
    expect(screen.getByText('italic')).toHaveStyle('font-style: italic');
  });

  // GIVEN markdown content with a code block
  // WHEN the component is rendered
  // THEN it should display the code with syntax highlighting
  it('renders code blocks with syntax highlighting', () => {
    const content = '```javascript\nconst x = 1;\n```';
    renderContentView(content);
    
    const codeBlock = screen.getByTestId('code-block');
    expect(codeBlock).toHaveAttribute('data-lang', 'javascript');
    expect(codeBlock).toHaveTextContent('const x = 1;');
  });

  // GIVEN markdown content with inline code
  // WHEN the component is rendered
  // THEN it should display the inline code correctly
  it('renders inline code correctly', () => {
    const content = 'This is `inline code`';
    renderContentView(content);
    
    // Instead of checking for an empty class, let's verify the element exists
    // and has the correct tag
    const inlineCodeElement = screen.getByText('inline code');
    expect(inlineCodeElement).toBeInTheDocument();
    expect(inlineCodeElement.tagName.toLowerCase()).toBe('code');
  });

  // GIVEN markdown content with a svelte code block
  // WHEN the component is rendered
  // THEN it should display it as a regular code block
  it('replaces svelte code blocks with regular code blocks', () => {
    const content = '```svelte\n<script>\n  let count = 0;\n</script>\n```';
    renderContentView(content);
    
    const codeBlock = screen.getByTestId('code-block');
    // Normalize whitespace for comparison
    const normalizedText = codeBlock.textContent?.replace(/\s+/g, ' ').trim();
    expect(normalizedText).toBe('<script> let count = 0; </script>');
  });

  // GIVEN markdown content with a link
  // WHEN the component is rendered
  // THEN it should display the link with target="_new"
  it('renders links with target="_new"', () => {
    const content = '[Link text](https://example.com)';
    renderContentView(content);
    
    const link = screen.getByText('Link text');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_new');
  });

  // GIVEN markdown content with a table
  // WHEN the component is rendered
  // THEN it should display the table correctly
  it('renders tables correctly', () => {
    const content = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
    renderContentView(content);
    
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
  });

  // GIVEN markdown content with math expressions
  // WHEN the component is rendered
  // THEN it should display the math correctly
  it('renders math expressions correctly', () => {
    const content = 'Math: $$E = mc^2$$';
    renderContentView(content);
    
    // KaTeX renders math in a span with class "katex"
    const mathElement = document.querySelector('.katex');
    expect(mathElement).toBeInTheDocument();
  });
});