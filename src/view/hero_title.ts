import { escapeHtml } from '../utils'

export default function renderHeroTitle(title: string): string {
  return `<img src="/images/logo.svg" alt="FingerprintJS" loading="lazy" class="hero-title__logo" />
<h1>${escapeHtml(title)}</h1>`
}
