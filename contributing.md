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

## Testing

```bash
yarn test
```

## Running locally

Connect to the PostgreSQL server, create and empty database and run all the files from the `migrations` directory in the database.

Copy the `.env.example` file to `.env`, open `.env` and change it to match the database.

The following command starts the application itself:

```bash
yarn start
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

## Building and deploying

The application is supposed to be deployed to AWS Lambda.

### Creating a database

Do the steps from this section once. You'll create a database where the application will store its data.

Sign-in to [the AWS console](https://console.aws.amazon.com).

Create a database:
- Go to [database management](https://console.aws.amazon.com/rds/home#databases:)
- Choose a region where the application will run in the top bar.
    Choose the same region every time you want to work with the application because resources in AWS (including databases and lambda functions) are separated into regions.
- Choose "Create database", fill the fields:
    - Engine type: `PostgreSQL`
    - Template: choose depending on your case
    - DB instance identifier: `nojs-fingerprint` (or any other name)
    - Master username & Master password: choose any, write them down
    - DB instance class: the smallest database class should suffice (look within the burstable classes).
    - Storage: `General Purpose`, the minimal allocated storage should suffice
    - Multi-AZ deployment: `Do not create a standby instance` should suffice
    - Public access: `Yes`
    - Database authentication options: `Password authentication`
- Click "Create database"

Open the page of the created database.
Find the "Connectivity & security" / "Endpoint & host" section.
Write down the endpoint and the port.

Connect to the DB server using any Postgres client. Then:
- Create a database with any name, e.g. `nojs-fingerprint`, write the name down
- Run all the files from the repository's `migrations` directory in the database

If this is a production database, turn off the public access in the AWS console.

### Creating a function

Do the steps from this section once. You'll create a lambda function that you'll upload the code to.

Create a lambda function:
- Go to [function management](https://console.aws.amazon.com/lambda/home#/functions)
- Choose the same region that you've chosen for the database
- Click "Create function"
- Choose "Author from scratch", fill the fields:
    - Function name: `nojs-fingerprint` (or any other name you want, remember it)
    - Runtime: `Node.js 14.x` (or newer)
    - Execution role: `Create a new role with basic Lambda permissions`
- Click "Create function"
- Scroll the function page down until you see the "Runtime settings" block, click "Edit", fill the fields and save:
    - Handler: `dist/index_lambda.handler`
- On the function page click "Configuration", "General configuration", "Edit", fill the fields and save:
    - Description: `HTTP server that runs the No-JavaScript fingerprinting demo (https://github.com/fingerprintjs/blog-nojs-fingerprint-demo)`
    - Memory (MB): `128`
    - Timeout: `10` seconds
- On the function page click "Configuration", "Environment variables" and add variables:
    - `NODE_OPTIONS` `--enable-source-maps`
    - `NODE_ENV` `production`
    - `DB_HOST` the endpoint of the database server that you've created earlier
    - `DB_PORT` the port of the database server
    - `DB_USERNAME` the username that you've created during the database creation
    - `DB_PASSWORD` the password for the username
    - `DB_DATABASE` the name of the database on the server (you've created it through a Postgres client)

Connect the function to an HTTP endpoint so that it can be called from a browser:
- On the page of the created function click "Add trigger", fill the fields:
    - Select a trigger: `API Gateway`
    - The select field below: `Create new API`
    - API type: `HTTP API`
    - Security: `Open`
- Click "Add"
- Click the API name
- Go to the API's stages, select the `default` stage and delete it
- Go to the API's routes, change the address of the `ANY` route to `/{proxy+}`.
    It will route all the URL paths to the function.
- Go to the API's integrations, select the `ANY` endpoint, detach the lambda integration and attach the existing lambda integration
- Go to the API's summary (the "API:..." button in the left menu).
    The "Invoke URL" field shows the URL that will run the function.

### Deploying the code

Every time somebody makes a PR or pushes to the "master" branch, GitHub Actions build a zip archive with the lambda function.
You need to do the following steps every time you want to deploy.

- Go to [the actions section](https://github.com/fingerprintjs/blog-nojs-fingerprint-demo/actions) of this GitHub repository
- Click the run that matches the commit that you want to deploy, wait for it to complete
- Scroll down until you see the "Artifacts" section, click "lambda" to download the lambda function archive
- Go to [function management](https://console.aws.amazon.com/lambda/home#/functions) in the AWS console,
    click `nojs-fingerprint` (the function that you've created earlier)
- Click the "Upload from" dropdown, select ".zip file", choose the downloaded archive

The new function code will apply immediately.
Open the application URL in a browser to check it.

If there are new database migrations, connect to the database using a Postgres client and run the new migrations.

### Monitoring

- Go to [function management](https://console.aws.amazon.com/lambda/home#/functions) in the AWS console,
    click `nojs-fingerprint` (the function that you've created earlier)
- Click "Monitoring", "Logs", scroll down to the "Recent invocation" table

Each row is a single application view. Some useful information:
- Initialization duration (when the function is called after a deployment or a long idle)
- Billed duration
- Max memory used (keep the memory higher than this number)
