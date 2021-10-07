import UAParser from 'ua-parser-js'

export default function renderJsDisableGuide(userAgent: string): [header: string, bodyHtml?: string] | undefined {
  const userAgentData = new UAParser(userAgent)
  const isIos = () => userAgentData.getOS().name === 'iOS'
  const isMobile = () => (['mobile', 'tablet'] as unknown[]).includes(userAgentData.getDevice().type)

  switch (userAgentData.getBrowser().name) {
    case 'Safari':
      return [
        'How to disable JavaScript in Safari:',
        renderItems([
          'Click “Safari” in the top menu, then “Preferences...”',
          'Click the “Security” tab',
          'Remove the checkmark next to “Enable JavaScript”',
        ]),
      ]

    case 'Mobile Safari':
      return [
        'How to disable JavaScript in Safari:',
        renderItems([
          'Go to the home screen, open the “Settings” application',
          'Scroll down, tap “Safari”',
          'Tap “Advanced”',
          'Turn off the “JavaScript” toggle',
        ]),
      ]

    case 'Chrome':
    case 'Chromium':
      if (isIos()) {
        return ['You can’t disable JavaScript in Google Chrome on iOS. Please try Safari.']
      }
      if (isMobile()) {
        return [
          'How to disable JavaScript in Google Chrome:',
          renderItems([
            'Tap the 3-dots button in the top right corner, then “Settings”',
            'Scroll down, tap “Site settings”',
            'Scroll down, tap “JavaScript”',
            'Turn off the “JavaScript” toggle',
          ]),
        ]
      }
      return [
        'How to disable JavaScript in Google Chrome:',
        renderItems([
          'Click the 3-dots button in the top right corner, then “Settings”',
          'Search “JavaScript”, click “Site Settings”',
          'Scroll down, click “JavaScript”',
          'Click “Don’t allow sites to use Javascript”',
        ]),
      ]

    case 'Firefox':
      if (isIos()) {
        return ['You can’t disable JavaScript in Firefox on iOS. Please try Safari.']
      }
      if (isMobile()) {
        return [
          'How to disable JavaScript in Firefox:',
          renderItems([
            'Tap the 3-dots button in the bottom right corner, then “Add-ons”',
            'Find “NoScript”, tap the plus button to install it',
          ]),
        ]
      }
      return [
        'How to disable JavaScript in Firefox:',
        renderItems([
          'Open a new browser tab',
          'Type <code>about:config</code> in the address bar, press <kbd>Enter</kbd>',
          'Search “javascript.enabled”',
          'Click the toggle button until “true” changes to “false”',
        ]),
      ]

    case 'Opera':
      if (isIos()) {
        return ['You can’t disable JavaScript in Opera on iOS. Please try Safari.']
      }
      if (isMobile()) {
        return [`You can’t disable JavaScript in Opera on ${userAgentData.getOS().name}. Please try Google Chrome.`]
      }
      return [
        'How to disable JavaScript in Opera:',
        renderItems([
          'Click the settings button in the top right corner, scroll down and click “Go to full browser settings”',
          'Search “JavaScript”, click “Site Settings”',
          'Scroll down, click “JavaScript”',
          'Click “Don’t allow sites to use Javascript”',
        ]),
      ]

    case 'Yandex':
      if (isIos()) {
        return ['You can’t disable JavaScript in Yandex Browser on iOS. Please try Safari.']
      }
      if (isMobile()) {
        return [
          `You can’t disable JavaScript in Yandex Browser on ${userAgentData.getOS().name}. Please try Google Chrome.`,
        ]
      }
      return [
        'How to disable JavaScript in Opera:',
        renderItems([
          'Click the hamburger button in the top right corner, then “Settings”',
          'Search “JavaScript”, click “Content settings”',
          'Scroll down, click “Do not allow any site to run JavaScript”',
        ]),
      ]
  }
  return undefined
}

function renderItems(items: readonly string[]) {
  return `<ol class="js-disable__steps js-disable__steps_count-${items.length}">
${items.map((item) => `<li>${item}</li>`).join('\n')}
</ol>`
}
