# [No-JavaScript fingerprinting demo](https://noscriptfingerprint.com/)

A fingerprint that works without JavaScript and cookies.

The fingerprint stays unaltered in the following conditions:

- Requesting desktop mode in mobile browsers
- Spoofing the user agent
- Going into incognito mode
- Changing the IP

## Quick start

You need to install [Node.js](https://nodejs.org), [Yarn](https://yarnpkg.com)
and a PostgreSQL server (e.g. [Postgress.app](https://postgresapp.com)) to run the application.

Connect to the PostgreSQL server, create and empty database and run all the files from the `migrations` directory in the database.

Copy the `.env.example` file to `.env`, open `.env` and change it to match the database.

Open this directory in a terminal and run:

```bash
yarn install
yarn dev
```

Then open the application in a browser: http://localhost:8080

Press <kbd>Ctrl</kbd>+<kbd>C</kbd> in the terminal to stop.

## Development, testing and deployment

See [contributing.md](contributing.md)
