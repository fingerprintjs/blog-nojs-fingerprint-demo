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

```bash
yarn start
```

## Building and deploying

The application is supposed to be deployed to AWS Lambda.

The application should be rebuilt and redeployed periodically
because the list of iCloud Private Relay egress IPs changes and the fresh list is downloaded during the build process.

### Creating a function

Do the steps from this section once. You'll create a lambda function that you'll upload the code to.

Sign-in to [the AWS console](https://console.aws.amazon.com).

Create a lambda function:
- Go to [function management](https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions)
- Choose a region where the function will run in the top bar.
    Choose the same region every time you want to work with the function because resources in AWS (including lambda functions) are separated into regions.
- Click "Create function"
- Choose "Author from scratch", fill the fields:
    - Function name: `nojs-fingerprint` (or any other name you want, remember it)
    - Runtime: `Node.js 14.x` (or newer)
    - Execution role: `Create a new role with basic Lambda permissions`
- Click "Create function"
- Scroll the function page down until you see the "Runtime settings" block, click "Edit", fill the fields and save:
    - Handler: `dist/lambda.handler`
- On the function page click "Configuration", "General configuration", "Edit", fill the fields and save:
    - Description: `HTTP server that runs the iCloud Private Relay IP leak demo (https://github.com/fingerprintjs/blog-nojs-fingerprint-demo)`
    - Memory (MB): `128`
    - Timeout: `10` seconds
- On the function page click "Configuration", "Environment variables" and add variables:
    - `NODE_OPTIONS` `--enable-source-maps`

Connect the function to an HTTP endpoint so that it can be called from a browser:
- On the page of the created function click "Add trigger", fill the fields:
    - Select a trigger: `API Gateway`
    - The select field below: `Create new API`
    - API type: `HTTP API`
    - Security: `Open`
- Click "Add"
- Click the trigger on the function page, open the "Details" dropdown.
    The "API endpoint" field shows the URL to run the function.
    You'll use it to access the application's HTTP server.

### Deploying the code

Every time somebody makes a PR or pushes to the "master" branch, GitHub Actions build a zip archive with the lambda function.
You need to do the following steps every time you want to deploy.

- Go to [the actions section](https://github.com/fingerprintjs/blog-nojs-fingerprint-demo/actions) of this GitHub repository
- Click the run that matches the commit that you want to deploy, wait for it to complete
- Scroll down until you see the "Artifacts" section, click "lambda" to download the lambda function archive
- Go to [function management](https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions) in the AWS console,
    click `nojs-fingerprint` (the function that you've created earlier)
- Click the "Upload from" dropdown, select ".zip file", choose the downloaded archive

The new function code will apply immediately.
Open the application URL in a browser to check it.

### Monitoring

- Go to [function management](https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions) in the AWS console,
    click `nojs-fingerprint` (the function that you've created earlier)
- Click "Monitoring", "Logs", scroll down to the "Recent invocation" table

Each row is a single application view. Some useful information:
- Initialization duration (when the function is called after a deployment or a long idle)
- Billed duration
- Max memory used (keep the memory higher than this number)
