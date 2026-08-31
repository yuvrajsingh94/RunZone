import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownMessageProps {
  content: string;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  return (
    <div className="markdown-content text-xs leading-relaxed font-sans select-text">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0 text-chalk-muted leading-relaxed">
              {children}
            </p>
          ),

          // Bold & Emphasis
          strong: ({ children }) => (
            <strong className="text-chalk font-semibold">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="text-chalk italic">{children}</em>
          ),

          // Headers
          h1: ({ children }) => (
            <h4 className="font-display font-bold text-sm text-chalk mt-3 mb-1.5 tracking-tight">
              {children}
            </h4>
          ),
          h2: ({ children }) => (
            <h4 className="font-display font-bold text-sm text-chalk mt-3 mb-1.5 tracking-tight">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="font-display font-semibold text-xs text-chalk mt-2.5 mb-1 tracking-tight">
              {children}
            </h5>
          ),
          h4: ({ children }) => (
            <h5 className="font-display font-semibold text-xs text-chalk mt-2 mb-1">
              {children}
            </h5>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-1.5 my-2 text-chalk-muted pl-1">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-1.5 my-2 text-chalk-muted pl-1 font-display tabular">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-xs leading-relaxed marker:text-cinder">
              <span className="font-sans text-chalk-muted">{children}</span>
            </li>
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 border border-hairline bg-night">
              <table className="w-full text-left text-xs border-collapse divide-y divide-hairline">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-panel-light font-display text-chalk text-[11px] font-semibold">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-hairline font-sans text-chalk-muted">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-panel/50 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-display font-semibold text-chalk text-[11px]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-xs leading-relaxed text-chalk-muted tabular">
              {children}
            </td>
          ),

          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-cinder pl-3 py-1.5 my-2.5 bg-night text-chalk-dim italic">
              {children}
            </blockquote>
          ),

          // Inline Code & Pre
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 bg-night border border-hairline font-display text-[11px] text-chalk font-medium">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="p-3 my-2 bg-night border border-hairline overflow-x-auto font-display text-[11px] text-chalk">
              {children}
            </pre>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cinder hover:underline font-medium"
            >
              {children}
            </a>
          ),

          // Horizontal rule
          hr: () => <hr className="my-3 border-hairline" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
