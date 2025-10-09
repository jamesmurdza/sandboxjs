# sandboxjs

[![CI](https://github.com/abdulrehmann231/sandboxjs/actions/workflows/ci.yml/badge.svg)](https://github.com/abdulrehmann231/sandboxjs/actions/workflows/ci.yml)

A unified interface for Linux-based cloud sandbox providers. It can be used to create the building blocks of AI agents that run code or perform other potentially unsafe operations.

## Usage

```js
import { Sandbox } from "@gitwit/sandbox";

// Create a new sandbox
const sandbox = await Sandbox.create("daytona"); // or "e2b" or "beam" or "codesandbox" or "modal"

// Create a sandbox with custom template
const customSandbox = await Sandbox.create("e2b", {
  template: "my-template-id",
});

// Connect to an existing sandbox
// const sandbox = await Sandbox.connect("daytona", "sandbox_id");

// Run commands and interact with the sandbox
const { output } = await sandbox.runCommand("echo 'hello world'");
console.log(output);
console.log(await sandbox.listFiles("/"));

// Suspend, resume and destroy the sandbox
await sandbox.suspend();
await sandbox.resume();
await sandbox.destroy();
```

## Provider Support

| Provider        | File Persistence | Memory Persistence | Read/Write Files | Recursive Delete | Directory Watch | Preview URLs | Pseudo-terminals | Env Variables | Destroy Sandbox | Build Templates |
| --------------- | ---------------- | ------------------ | ---------------- | ---------------- | --------------- | ------------ | ---------------- | ------------- | --------------- | --------------- |
| [**E2B**](https://e2b.dev/docs)                    | ✅               | ✅                 | ✅               | ✅               | ✅              | ✅           | ✅               | ✅            | ✅              | ✅              |
| [**Daytona**](https://www.daytona.io/docs/)        | ✅               | ❌                 | ✅               | ❌               | ❌              | ✅           | ❌               | ✅            | ✅              | ✅              |
| [**Beam**](https://docs.beam.cloud/v2/)            | ✅               | ✅                 | ✅               | ❌               | ❌              | ✅           | ❌               | ✅            | ✅              | 🚧              |
| [**CodeSandbox**](https://codesandbox.io/docs/sdk) | ✅               | ✅                 | ✅               | ✅               | ✅              | ✅           | ✅               | ❌            | ❌              | 🚧              |
| [**Modal**](https://modal.com/docs/guide/sandbox)  | ✅               | ❌                 | ✅               | ❌               | ❌              | ✅           | ❌               | ❌            | ✅              | 🚧              |

## Getting Started

### 1. Set up environment variables

Create a `.env` file in the root directory of the project and add at least one of the following environment variables:

```shell
# Get an E2B API key here: https://e2b.dev/dashboard
E2B_API_KEY=
# Get a Daytona API key here: https://app.daytona.io/dashboard/keys
DAYTONA_API_KEY=
# Get a Beam API token here: https://platform.beam.cloud/settings/api-keys
BEAM_WORKSPACE_ID=
BEAM_TOKEN=
# Get a CodeSandbox API key here: https://codesandbox.io/t
CODESANDBOX_API_KEY=
# Get a Modal API token here: https://modal.com/settings/tokens
MODAL_TOKEN_ID=
MODAL_TOKEN_SECRET=
```

### 2. Install dependencies

```
npm install
```

### 3. Build the project

Compiles the TypeScript source files to JavaScript in the `dist/` directory.

```
npm run build
```

### 4. Run the example

After building, run the example script:

```
node dist/example.js
```

### 5. Run tests

To run the test suite:

```
npm test
```

## Methods

### create

```js
// Create default sandbox
const sandbox = await Sandbox.create("daytona"); // or "codesandbox" or "e2b" or "modal"

// Create sandbox with additional parameters
const e2bSandbox = await Sandbox.create("e2b", {
  template: "my-template-id",
  envs: { KEY: "value" },
});
```

### connect

```js
const sandbox = await Sandbox.connect("daytona", "sandbox_id");
```

### runCommand

Execute commands in the sandbox with support for background execution and command options.

```js
// Basic command execution
const { exitCode, output } = await sandbox.runCommand("echo 'hello world'");
console.log(output); // "hello world"
console.log(exitCode); // 0

// Command with options
const result = await sandbox.runCommand("ls -la", {
  cwd: "/tmp",
  envs: { MY_VAR: "value" },
  timeoutMs: 5000,
});

// Background command execution
const { pid } = await sandbox.runCommand("sleep 10", { background: true });
console.log(`Background process started with PID: ${pid}`);
```

### suspend

```js
await sandbox.suspend();
```

### resume

```js
await sandbox.resume();
```

### destroy

```js
await sandbox.destroy();
```

### readFile

```js
console.log(await sandbox.readFile("/path/to/file"));
```

### writeFile

```js
await sandbox.writeFile("/path/to/file", "content");
```

### listFiles

```js
console.log(await sandbox.listFiles("/path/to/directory"));
```

### moveFile

```js
await sandbox.moveFile("/path/to/file", "/path/to/new/file");
```

### deleteFile

```js
await sandbox.deleteFile("/path/to/file");
```

### createDirectory

```js
await sandbox.createDirectory("/path/to/directory");
```

### getPreviewUrl

```js
console.log(await sandbox.getPreviewUrl(8080));
```

### createTerminal

```js
const terminal = await sandbox.createTerminal();
```

### Terminal Methods

```js
await terminal.write("echo 'hello world'");
await terminal.resize(80, 24);
await terminal.kill();
```

## Template Building

Build custom templates from your projects in a unified way across all providers.

> **Note:** Your project directory must contain a `Dockerfile` (or `*.Dockerfile` file).

### Build E2B template

```ts
import { buildTemplate } from "@gitwit/sandbox";

await buildTemplate("e2b", "./my-project", "my-template", {
  cpuCount: 2,
  memoryMB: 1024,
  teamId: "your-team-id",
});

// Use built template
const sandbox = await Sandbox.create("e2b", { template: "my-template" });
```

### Build Daytona snapshot

```ts
import { buildTemplate } from "@gitwit/sandbox";

await buildTemplate("daytona", "./my-project", "my-snapshot", {
  cpu: 2,
  memory: 4,
  disk: 10,
});

// Use built template
const sandbox = await Sandbox.create("daytona", { template: "my-snapshot" });
```

## Future Plans

- Add support for watching file system changes
- Add support for running code
