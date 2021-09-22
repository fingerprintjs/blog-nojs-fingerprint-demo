# No-JavaScript fingerprinting demo

A fingerprint that works without JavaScript and cookies.

The fingerprint stays unaltered in the following conditions:

- Requesting desktop mode in mobile browsers
- Spoofing the user agent
- Going into incognito mode
- Changing the IP

## Quick start

You need to install [Node.js](https://nodejs.org) and [Yarn](https://yarnpkg.com) to run the application.

Open this directory in a terminal and run:

```bash
yarn install
yarn start # Run `PORT=3000 yarn start` to start the app on another port
```

Then open the application in a browser: http://localhost:8080

Press <kbd>Ctrl</kbd>+<kbd>C</kbd> in the terminal to stop.

## Development, testing and deployment

See [contributing.md](contributing.md)
