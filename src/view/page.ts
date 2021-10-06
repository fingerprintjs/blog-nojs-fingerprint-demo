import { escapeHtml, HttpResponse } from '../utils'

export interface Options {
  htmlTitle?: string
  upperHeadHtml?: string
  lowerHeadHtml?: string
  bodyHtml?: string
  noMinWidth?: boolean
}

/**
 * The very generic HTML page layout that includes only the background, fonts and the meta tags
 */
export default function renderPage({
  htmlTitle = '',
  upperHeadHtml = '',
  lowerHeadHtml = '',
  bodyHtml = '',
  noMinWidth,
}: Options): HttpResponse {
  const body = `<!DOCTYPE html>
<html lang="en">
  <head>
    ${upperHeadHtml}
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>${htmlTitle && `${escapeHtml(htmlTitle)} | `}No-JavaScript fingerprinting</title>
    <link rel="icon" href="/images/favicon.ico" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600&display=swap" />
    <link rel="stylesheet" href="/style.css" />
    ${lowerHeadHtml}
  </head>
  <body ${noMinWidth ? 'class="_no-min-width"' : ''}>
    ${bodyHtml}
  </body>
</html>`

  return {
    body,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  }
}
