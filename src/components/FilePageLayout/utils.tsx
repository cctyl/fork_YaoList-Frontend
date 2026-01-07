import { useState, useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import mermaid from 'mermaid'

// 初始化 Mermaid
mermaid.initialize({ startOnLoad: false, theme: 'default' })

// Mermaid 图表组件
export const MermaidChart = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  
  useEffect(() => {
    if (ref.current && chart) {
      const id = 'mermaid-' + Math.random().toString(36).substr(2, 9)
      mermaid.render(id, chart)
        .then(({ svg }) => {
          if (ref.current) {
            ref.current.innerHTML = svg
            setError(false)
          }
        })
        .catch(() => {
          setError(true)
        })
    }
  }, [chart])
  
  if (error) {
    return <pre className="mermaid-fallback"><code>{chart}</code></pre>
  }
  return <div ref={ref} className="mermaid-chart" />
}

// Emoji 映射
export const emojiMap: Record<string, string> = {
  'smiley': '😊', 'smile': '😄', 'grin': '😁', 'star': '⭐', 'heart': '❤️',
  'thumbsup': '👍', 'thumbsdown': '👎', 'ok_hand': '👌', 'clap': '👏',
  'fire': '🔥', 'rocket': '🚀', 'warning': '⚠️', 'check': '✅', 'x': '❌',
  'question': '❓', 'exclamation': '❗', 'bulb': '💡', 'memo': '📝',
  'book': '📖', 'link': '🔗', 'lock': '🔒', 'key': '🔑', 'mag': '🔍',
}

// 处理 Emoji 文本
export const processEmoji = (text: string) => {
  return text.replace(/:([a-z_]+):/g, (match, name) => emojiMap[name] || match)
}

// 检测内容是否是 HTML
export const isHtmlContent = (content: string): boolean => {
  const trimmed = content.trim()
  return /^<!DOCTYPE/i.test(trimmed) || 
         /^<html/i.test(trimmed) ||
         /<(html|head|body|script|style|link|meta)\b/i.test(trimmed)
}

// HTML 内容渲染组件
export const HtmlContentRenderer = ({ content, className }: { content: string; className?: string }) => {
  const [loading, setLoading] = useState(true)
  const [height, setHeight] = useState(50)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  
  const resetStyle = `<style>html,body{background:transparent!important;margin:0!important;padding:0!important;overflow:hidden!important;}::-webkit-scrollbar{display:none;}</style>`
  const trimmed = content.trim()
  const hasDoctype = /^<!DOCTYPE/i.test(trimmed)
  const hasHtml = /<html[\s>]/i.test(trimmed)
  
  let contentWithStyle: string
  if (hasDoctype || hasHtml) {
    contentWithStyle = content.includes('<head>') 
      ? content.replace('<head>', `<head>${resetStyle}`)
      : content.includes('<HEAD>') 
        ? content.replace('<HEAD>', `<HEAD>${resetStyle}`)
        : content.replace(/<html[^>]*>/i, (match) => `${match}<head>${resetStyle}</head>`)
  } else {
    contentWithStyle = `<!DOCTYPE html><html><head><meta charset="UTF-8">${resetStyle}</head><body>${content}</body></html>`
  }
  
  const handleLoad = () => {
    setLoading(false)
    const updateHeight = () => {
      try {
        const iframe = iframeRef.current
        if (iframe?.contentDocument?.body) {
          const h = iframe.contentDocument.body.scrollHeight
          setHeight(Math.max(h, 30))
        }
      } catch {}
    }
    updateHeight()
    setTimeout(updateHeight, 500)
    setTimeout(updateHeight, 1500)
  }
  
  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {loading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '16px',
          color: 'var(--text-secondary)',
          fontSize: '14px'
        }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          <span>加载中...</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={contentWithStyle}
        className={className}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        onLoad={handleLoad}
        scrolling="no"
        style={{
          width: '100%',
          height: loading ? 0 : height,
          border: 'none',
          background: 'transparent',
          display: loading ? 'none' : 'block',
          overflow: 'hidden'
        }}
      />
    </div>
  )
}

// Markdown 渲染组件
export const MarkdownRenderer = ({ content }: { content: string }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, rehypeKatex, rehypeHighlight]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const lang = match?.[1]
          const code = String(children).replace(/\n$/, '')
          if (lang === 'mermaid') {
            return <MermaidChart chart={code} />
          }
          return <code className={className} {...props}>{children}</code>
        },
        p({ children }) {
          if (typeof children === 'string') {
            return <p>{processEmoji(children)}</p>
          }
          return <p>{children}</p>
        }
      }}
    >{content}</ReactMarkdown>
  )
}

// 元信息渲染组件（header 或 readme）
export const MetaContentRenderer = ({ content, className }: { content: string; className?: string }) => {
  if (!content) return null
  
  return (
    <div className={`file-browser__meta-card ${className || ''}`}>
      <div className="file-browser__meta-content">
        {isHtmlContent(content) ? (
          <HtmlContentRenderer content={content} className="file-browser__html-content" />
        ) : (
          <MarkdownRenderer content={content} />
        )}
      </div>
    </div>
  )
}
