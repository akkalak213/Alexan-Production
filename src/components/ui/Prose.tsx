import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { headingId, textOf } from '@/lib/headings'
import { cn } from '@/lib/utils'

/**
 * แสดงเนื้อหา Markdown จากฐานข้อมูล
 * ใช้ react-markdown แทนการ dangerouslySetInnerHTML เพื่อไม่ให้ HTML ที่แอดมินพิมพ์กลายเป็น XSS
 */
export function Prose({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose-body max-w-2xl space-y-5', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // id ตรงกับสารบัญที่ markdownHeadings สร้างจากต้นฉบับ ลิงก์ในสารบัญจึงพามาถูกหัวข้อ
          h2: ({ children }) => (
            <h2 id={headingId(textOf(children))} className="mt-14 scroll-mt-28 font-display text-[1.75rem] leading-snug first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 font-display text-2xl first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="text-pretty">{children}</p>,
          ul: ({ children }) => (
            <ul className="ml-5 list-disc space-y-2 marker:text-accent">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="ml-5 list-decimal space-y-2 marker:text-accent">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1 text-pretty">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent pl-5 font-display text-xl text-foreground">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-accent underline underline-offset-4 hover:no-underline"
              {...(href?.startsWith('http') ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md border border-border bg-subtle p-4 font-mono text-sm">
              {children}
            </pre>
          ),
          hr: () => <hr className="my-10 border-border" />,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border px-3 py-2 text-left font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/60 px-3 py-2 text-muted-foreground">{children}</td>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
