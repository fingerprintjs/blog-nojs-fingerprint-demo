# Contributing

Install Yarn dependencies before running any other command:

```bash
yarn install
```

## Code style

Use ESLint to check your code style:

```bash
yarn lint
```

## Running locally

Connect to the PostgreSQL server, create and empty database and run all the files from the `migrations` directory in the database.

Copy the `.env.example` file to `.env`, open `.env` and change it to match the database.

The following command starts the application itself:

```bash
yarn dev
```

## A script to see all supported CSS properties

```js
var props = new Set()
for (const prop of Object.getOwnPropertyNames(getComputedStyle(document.body))) {
  if (!/^\d+$/.test(prop)) {
    props.add(prop)
  }
}
if (typeof CSSStyleDeclaration !== 'undefined') {
  for (const prop of Object.getOwnPropertyNames(CSSStyleDeclaration.prototype)) {
    props.add(prop)
  }
}
if (typeof CSS2Properties !== 'undefined') {
  for (const prop of Object.getOwnPropertyNames(CSS2Properties.prototype)) {
    props.add(prop)
  }
}
var output = document.createElement('textarea')
output.value = [...props].sort().join('\n')
document.body.appendChild(output)
```

## Building

Run to build the application:

```bash
yarn build
```

Run to start the built application:

```bash
yarn start
```

## Deploying

The application can be deployed to any server that runs Node.js.

This guide tells how to deploy to AWS Elastic Beanstalk.

### Creating a database

Do the steps from this section once. You'll create a database where the application will store its data.

Sign-in to [the AWS console](https://console.aws.amazon.com).

Create a database:
- Go to [database management](https://console.aws.amazon.com/rds/home#databases:)
- Choose a region where the application will run in the top bar.
    Choose the same region every time you want to work with the application because resources in AWS
    (including databases and Elastic Beanstalk environments) are separated into regions.
- Choose "Create database", fill the fields:
    - Engine type: `PostgreSQL`
    - Template: choose depending on your case
    - DB instance identifier: `nojs-fingerprint` (or any other name)
    - Master username & Master password: choose any, write them down
    - DB instance class: the smallest database class should suffice (look within the burstable classes).
    - Storage: `General Purpose`, the minimal allocated storage should suffice
    - Multi-AZ deployment: `Do not create a standby instance` should suffice
    - Public access: `Yes`. If you set `No`, the database won't be accessible from the Elastic Beanstalk application.
    - Database authentication options: `Password authentication`
- Click "Create database"

Open the page of the created database.
Find the "Connectivity & security" / "Endpoint & host" section.
Write down the endpoint and the port.

Connect to the DB server using any Postgres client. Then:
- Create a database with any name, e.g. `nojs-fingerprint`, write the name down
- Run all the files from the repository's `migrations` directory in the database

### Creating an application

Do the steps from this section once. You'll create an Elastic Beanstalk application that you'll upload the code to.

Create an application and an environment:
- Go to [environment management](https://console.aws.amazon.com/elasticbeanstalk/home)
- Choose the same region that you've chosen for the database
- Click "Create a new environment"
- Select `Web server environment`
- On the next screen fill the fields:
    - Application name: `nojs-fingerprint` (or any other name you want)
    - Environment name: `nojs-fingerprint` (or any other name you want)
    - Description: `HTTP server that runs the No-JavaScript fingerprinting demo (https://github.com/fingerprintjs/blog-nojs-fingerprint-demo)`
    - Platform: `Managed platform`
    - Platform: `Node.js`
    - Platform branch and version: the latest
    - Application code: `Sample application`
- Click "Create environment"
- Open the created environment configuration, click "Edit" besides "Software", scroll down to "Environment properties"
    and add variables (make sure the "Apply" button is active before filling, otherwise wait and reload the page):
    - `NODE_OPTIONS` `--enable-source-maps`
    - `NODE_ENV` `production`
    - `REDIRECT_FROM_WWW` `true`
    - `SERVER_TRUST_PROXY` `loopback,linklocal,uniquelocal`
    - `DB_HOST` the endpoint of the database server that you've created earlier
    - `DB_PORT` the port of the database server
    - `DB_USERNAME` the username that you've created during the database creation
    - `DB_PASSWORD` the password for the username
    - `DB_DATABASE` the name of the database on the server (you've created it through a Postgres client)
- Click "Apply" to save the settings
- Go to the environment main page to see the address that the application runs on.
    You can either click the link under the environment name, or click "Go to environment".

Use [this guide](https://medium.com/@jameshamann/configuring-your-elastic-beanstalk-app-for-ssl-9065ca091f49)
to attach a domain name and enable HTTPS.
If you enable HTTPS, add this environment variable to the environment settings: `REDIRECT_FROM_HTTP` `true`.

### Deploying the code

Every time somebody makes a PR or pushes to the "master" branch, GitHub Actions build a zip archive with the application.
You need to do the following steps every time you want to deploy.

- Go to [the actions section](https://github.com/fingerprintjs/blog-nojs-fingerprint-demo/actions) of this GitHub repository
- Click the run that matches the commit that you want to deploy, wait for it to complete
- Scroll down until you see the "Artifacts" section, click "Upload me to EB environment" to download the application archive
- Go to [environment management](https://console.aws.amazon.com/elasticbeanstalk/home) in the AWS console,
    click `nojs-fingerprint` (the environment that you've created earlier)
- Click "Upload and deploy", click "Choose file", choose the downloaded archive,
    type `nojs-fingerprint-1` (or whatever you want) in the Version label field if it's empty, click "Deploy".
    Wait a couple of minutes until the new code applies.

The application will start updating, the new code will apply in a couple of minutes.

If there are new database migrations, connect to the database using a Postgres client and run the new migrations.
