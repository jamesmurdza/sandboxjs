# sandboxjs

A package that exports a Sandbox class and detects API keys from environment variables.

## Getting Started

### 1. Install dependencies

```
npm install
```

### 2. Build the project

Compiles the TypeScript source files to JavaScript in the `dist/` directory.

```
npm run build
```

### 3. Set up environment variables

For CodeSandbox integration, set your API key:

```
export CODESANDBOX_API_KEY=your_api_key_here
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

---

## Notes

- The example uses CodeSandbox by default. You can change the sandbox type in `src/example.ts`.
- Make sure to set the required API keys in your environment for the respective sandbox providers.

## Installation

```sh
npm install sandboxjs
```

## Usage

### Create a sandbox

```js
import Sandbox from "sandboxjs";

const sandbox = await Sandbox.create("daytona"); // or "codesandbox" or "e2b"

console.log(await sandbox.run("echo 'hello world'"));

console.log(sandbox.id());

await sandbox.suspend();
```

### Connect to a sandbox

```js
import Sandbox from "sandboxjs";

const sandbox = await Sandbox.connect("daytona", "sandbox_id");

console.log(await sandbox.run("echo 'hello world'"));

await sandbox.destroy();
```

## Methods

### create

```js
const sandbox = await Sandbox.create("daytona");
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
