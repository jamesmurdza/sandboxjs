# sandboxjs

A unified interface for with Linux-based cloud sandbox providers. It can be used to create the building blocks of AI agents that run code or perform other potentially unsafe operations.

## Usage

```js
import Sandbox from "@jamesmurdza/sandboxjs";

// Create a new sandbox
const sandbox = await Sandbox.create("daytona"); // or "codesandbox" or "e2b"

// Connect to an existing sandbox
// const sandbox = await Sandbox.connect("daytona", "sandbox_id");

// Run commands and interact with the sandbox
console.log(await sandbox.run("echo 'hello world'"));
console.log(await sandbox.listFiles("/"));

// Suspend, resume and destroy the sandbox
await sandbox.suspend();
await sandbox.resume();
await sandbox.destroy();
```

## Provider Support

| Tool            | Filesystem Persistence | Memory Persistence | Read/Write Files | Recursive Delete | Filesystem Watch | Preview URLs | Pseudo-terminals |
| --------------- | ---------------------- | ------------------ | ---------------- | ---------------- | ---------------- | ------------ | ---------------- |
| **E2B**         | ✅                     | ✅                 | ✅               | ✅               | ✅               | ✅           | ✅               |
| **Daytona**     | ✅                     | ❌                 | ✅               | ❌               | ❌               | ✅           | ❌               |
| **Codesandbox** | ✅                     | ✅                 | ✅               | ✅               | ✅               | ✅           | ✅               |

## Getting Started

### 1. Set up environment variables

Create a `.env` file in the root directory of the project and add at least one of the following environment variables:

```shell
# Get an E2B API key here: https://e2b.dev/dashboard
E2B_API_KEY=
# Get a Daytona API key here: https://app.daytona.io/dashboard/keys
DAYTONA_API_KEY=
# Get a CodeSandbox API key here: https://codesandbox.io/t
CODESANDBOX_API_KEY=
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
const sandbox = await Sandbox.create("daytona"); // or "codesandbox" or "e2b"
```

### connect

```js
const sandbox = await Sandbox.connect("daytona", "sandbox_id");
```

### run

```js
console.log(await sandbox.run("echo 'hello world'"));
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

## Future Plans

- Add support for watching filesystem changes
- Add pseudo-terminal support
- Add support for running commands in the background
