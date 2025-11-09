'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  math: string;
  displayMode?: boolean;
  className?: string;
}

export function MathRenderer({ math, displayMode = false, className = '' }: MathRendererProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current && math) {
      try {
        katex.render(math, containerRef.current, {
          displayMode,
          throwOnError: false,
          errorColor: '#cc0000',
          strict: 'warn',
        });
      } catch (error) {
        console.error('KaTeX rendering error:', error);
        if (containerRef.current) {
          containerRef.current.textContent = math;
        }
      }
    }
  }, [math, displayMode]);

  return <span ref={containerRef} className={className} />;
}

// Helper component for inline math
export function InlineMath({ children, className }: { children: string; className?: string }) {
  return <MathRenderer math={children} displayMode={false} className={className} />;
}

// Helper component for display math (block)
export function DisplayMath({ children, className }: { children: string; className?: string }) {
  return <MathRenderer math={children} displayMode={true} className={className} />;
}

// Helper function to detect and render math in text
export function renderTextWithMath(text: string): (string | JSX.Element)[] {
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let index = 0;

  // Match $...$ for inline math or $$...$$ for display math
  const mathRegex = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
  let match;

  while ((match = mathRegex.exec(text)) !== null) {
    // Add text before math
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    // Add math
    const isDisplay = match[0].startsWith('$$');
    const mathContent = match[1] || match[2];
    parts.push(
      <MathRenderer
        key={`math-${index++}`}
        math={mathContent}
        displayMode={isDisplay}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
