import { HttpResponse } from '../utils'
import renderPage, { Options as PageOptions } from './page'

export type Options = Omit<PageOptions, 'noMinWidth'>

export default function renderFrameLayout({ bodyHtml = '', ...options }: Options): HttpResponse {
  return renderPage({
    ...options,
    noMinWidth: true,
    bodyHtml: `
<div class="frame-layout fp-block">
  ${bodyHtml}
</div>
    `,
  })
}
