"use client";

import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

type MarkdownContentProps = {
  value?: string | null;
};

function normalizeUrl(value: string): string {
  const trimmed = value.trim().replace(/^<|>$/g, "");
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  return trimmed;
}

function proxyUploadsUrl(value: string): string {
  try {
    const parsed = new URL(value);
    if (parsed.hostname === "uploads.linear.app") {
      return `/api/linear/file?url=${encodeURIComponent(parsed.toString())}`;
    }
  } catch {
    // ignore invalid urls and return as-is
  }
  return value;
}

export default function MarkdownContent({ value }: MarkdownContentProps) {
  const source = value?.trim() || "No description provided.";

  return (
    <div className="markdown-body mt-2 text-sm text-gray-700">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          img: ({ src, alt }) => {
            const normalized =
              typeof src === "string" ? proxyUploadsUrl(normalizeUrl(src)) : "";
            if (!normalized) return null;
            return (
              <Image
                src={normalized}
                alt={alt || "Attachment"}
                width={1400}
                height={900}
                unoptimized
              />
            );
          },
          a: ({ href, children }) => {
            const normalized = typeof href === "string" ? normalizeUrl(href) : "";
            return (
              <a href={normalized} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
