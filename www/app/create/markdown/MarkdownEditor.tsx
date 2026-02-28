'use client';

import React, {useRef, useEffect} from 'react';

const MONOSPACE_FONT =
  'ui-monospace, "Cascadia Mono", "Segoe UI Mono", "Roboto Mono", Menlo, Monaco, "Courier New", monospace';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function highlightMarkdownLine(line: string): string {
  const escaped = escapeHtml(line);
  if (!escaped.trim()) return escaped;

  if (/^[-*_]{2,}\s*$/.test(line.trim())) {
    return `<span class="md-hr">${escaped}</span>`;
  }

  const hMatch = line.match(/^(#{1,6})\s+(.*)$/);
  if (hMatch) {
    const level = hMatch[1].length;
    const rest = escapeHtml(hMatch[2]);
    return `<span class="md-hash">${escapeHtml(hMatch[1])}</span> <span class="md-h${level}">${rest}</span>`;
  }

  let out = escaped;
  out = out.replace(/^(&gt;)\s?/g, '<span class="md-blockquote">$1 </span>');
  out = out.replace(
    /\[([^\]]*)\]\(([^)]*)\)/g,
    '<span class="md-link">[$1]($2)</span>'
  );
  out = out.replace(
    /(\*\*)(.+?)(\*\*)/g,
    '<span class="md-bold">**$2**</span>'
  );
  out = out.replace(/(\*)([^*]+?)(\*)/g, '<span class="md-italic">*$2*</span>');
  out = out.replace(/`([^`]+)`/g, '<span class="md-code">`$1`</span>');
  return out;
}

function highlightedMarkdownHtml(value: string): string {
  return value
    .split('\n')
    .map(line => highlightMarkdownLine(line))
    .join('\n');
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className = '',
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    const pre = preRef.current;
    if (!ta || !pre) return;
    const sync = () => {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    };
    ta.addEventListener('scroll', sync);
    return () => ta.removeEventListener('scroll', sync);
  }, []);

  const html = highlightedMarkdownHtml(value || '');

  const editorStyle: React.CSSProperties = {
    fontFamily: MONOSPACE_FONT,
    fontSize: '0.875rem',
    lineHeight: 1.625,
    letterSpacing: 'normal',
    padding: '0.75rem',
  };

  return (
    <div className={`md-editor-root relative ${className}`}>
      <pre
        ref={preRef}
        className="pointer-events-none absolute inset-0 overflow-auto whitespace-pre-wrap break-words rounded border border-transparent text-gray-800"
        aria-hidden
        style={{margin: 0, ...editorStyle}}
      >
        <code
          className="block min-h-full"
          dangerouslySetInnerHTML={{__html: html || '\u00a0'}}
        />
      </pre>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="relative min-h-full w-full resize-none rounded border border-gray-300 bg-transparent text-transparent caret-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        style={editorStyle}
      />
      <style>{`
        .md-editor-root .md-hr { color: #94a3b8; }
        .md-editor-root .md-hash { color: #64748b; }
        .md-editor-root .md-h1 { color: #0f172a; }
        .md-editor-root .md-h2 { color: #1e293b; }
        .md-editor-root .md-h3, .md-editor-root .md-h4,
        .md-editor-root .md-h5, .md-editor-root .md-h6 { color: #334155; }
        .md-editor-root .md-bold { color: #0f172a; }
        .md-editor-root .md-italic { color: #475569; }
        .md-editor-root .md-code { background: #f1f5f9; color: #c2410c; border-radius: 0.2em; }
        .md-editor-root .md-blockquote { color: #64748b; }
        .md-editor-root .md-link { color: #2563eb; }
      `}</style>
    </div>
  );
}
