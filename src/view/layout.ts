import { HttpResponse } from '../utils'
import renderPage, { Options as PageOptions } from './page'

export interface Options extends PageOptions {
  wideSubBodyHtml?: string
}

/**
 * A generic page layout that includes the page paddings and the footer
 */
export default function renderLayout({ bodyHtml = '', wideSubBodyHtml, ...options }: Options): HttpResponse {
  return renderPage({
    ...options,
    bodyHtml: `<div class="main-layout">
  <main class="main-layout__body">${bodyHtml}</main>
  ${wideSubBodyHtml ? `<section class="main-layout__wide-sub-body">${wideSubBodyHtml}</section>` : ''}
  <footer class="main-layout__footer">
    <a href="https://fingerprint.com/blog/disabling-javascript-wont-stop-fingerprinting/" target="_blank">
      Read an article ↗
    </a>
    <a href="https://github.com/fingerprintjs/blog-nojs-fingerprint-demo/" target="_blank">Source code ↗</a>
    <a href="https://fingerprint.com" target="_blank">By Fingerprint ↗</a>
  </footer>
</div>`,
  })
}
