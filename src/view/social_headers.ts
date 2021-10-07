import { escapeHtml } from '../utils'

export default function renderSocialHeaders(pageUrl: string, title: string, description: string): string {
  const requestOrigin = /^(.*?\/\/.*?)(\/|$)/.exec(pageUrl)?.[1] || ''

  return `<meta name="title" content="${escapeHtml(title)}" />
<meta name="twitter:title" property="og:title" content="${escapeHtml(title)}" />
<meta name="description" content="${escapeHtml(description)}" />
<meta name="twitter:description" property="og:description" content="${escapeHtml(description)}" />
<link rel="image_src" href="${escapeHtml(`${requestOrigin}/images/preview.png`)}" />
<meta name="twitter:image" property="og:image" content="${escapeHtml(`${requestOrigin}/images/preview.png`)}" />
<link rel="canonical" href="${escapeHtml(pageUrl)}" />
<meta name="twitter:url" property="og:url" content="${escapeHtml(pageUrl)}" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />`
}
