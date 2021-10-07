import { HttpResponse } from '../utils'
import renderLayout from './layout'
import renderHeroTitle from './hero_title'

export default function renderNotFoundPage(): HttpResponse {
  return {
    ...renderLayout({
      bodyHtml: `${renderHeroTitle('This page can’t be found')}
<a href="/">Go to start page →</a>`,
    }),
    status: 404,
  }
}
