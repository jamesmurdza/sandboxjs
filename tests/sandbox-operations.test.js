import { Sandbox } from './dist/index.js';
import { describe, test, afterEach, expect } from 'vitest';

// Test both E2B and Daytona providers
const providers = ['e2b', 'daytona'];

providers.forEach(provider => {
  describe(`${provider.toUpperCase()} Sandbox Operations`, () => {
    let sandbox;

    afterEach(async () => {
      if (sandbox) {
        try {
          await sandbox.destroy();
        } catch {}
        sandbox = undefined;
      }
    });

    // Create
    test(`create ${provider} sandbox`, async () => {
      sandbox = await Sandbox.create(provider);

      expect(sandbox).toBeDefined();
      expect(sandbox.id()).toBeDefined();
      expect(typeof sandbox.id()).toBe('string');
    });

    // Update (suspend/resume)
    test(`update ${provider} sandbox (suspend/resume)`, async () => {
      sandbox = await Sandbox.create(provider);

      await sandbox.writeFile('/tmp/test.txt', 'test content');
      await sandbox.suspend();
      await sandbox.resume();

      const content = await sandbox.readFile('/tmp/test.txt');
      expect(content).toBe('test content');
    }, 30000);

    // Commands
    test('run basic command', async () => {
      sandbox = await Sandbox.create(provider);

      const result = await sandbox.runCommand('echo "Hello World"');
      expect(result.trim()).toBe('Hello World');
    }, 20000);

    test('write via runCommand and read via connected sandbox', async () => {
      sandbox = await Sandbox.create(provider);

      const filename = 'testfile.txt';
      const content = `Hello from ${provider} sandbox!`;

      await sandbox.runCommand(`echo '${content}' > ${filename}`);

      const sandbox2 = await Sandbox.connect(provider, sandbox.id());
      const output = await sandbox2.runCommand(`cat ${filename}`);
      expect(output.trim()).toBe(content);

      await sandbox2.destroy();
    }, 20000);

    // Files
    test('read and write files', async () => {
      sandbox = await Sandbox.create(provider);

      const filename = 'rw_testfile.txt';
      const content = `Hello from ${provider} sandbox!`;

      await sandbox.writeFile(filename, content);
      const fileContent = await sandbox.readFile(filename);
      expect(fileContent).toBe(content);
    });

    test('list files includes created file', async () => {
      sandbox = await Sandbox.create(provider);

      const filename = 'ls_testfile.txt';

      await sandbox.writeFile(filename, 'x');
      const files = await sandbox.listFiles('.');
      expect(files.some(({ name }) => name === filename)).toBe(true);
    });

    test('create directory', async () => {
      sandbox = await Sandbox.create(provider);

      const dirname = 'testdir';

      await sandbox.createDirectory(dirname);
      const files = await sandbox.listFiles('.');
      expect(files.some(({ name, type }) => name === dirname && type === 'directory')).toBe(true);
    }, 20000);

    test('move files', async () => {
      sandbox = await Sandbox.create(provider);

      const filename = 'mv_testfile.txt';
      const dirname = 'testdir';
      const content = `Hello from ${provider} sandbox!`;

      await sandbox.writeFile(filename, content);
      await sandbox.createDirectory(dirname);

      const newPath = `${dirname}/moved_${filename}`;
      await sandbox.moveFile(filename, newPath);

      const newDirFiles = await sandbox.listFiles(dirname);
      expect(newDirFiles.some(({ name }) => name === `moved_${filename}`)).toBe(true);
    });

    test('delete files', async () => {
      sandbox = await Sandbox.create(provider);

      const filename = 'del_testfile.txt';

      await sandbox.writeFile(filename, 'x');
      const files = await sandbox.listFiles('.');
      expect(files.some(({ name }) => name === filename)).toBe(true);

      await sandbox.deleteFile(filename);
      const filesAfterDelete = await sandbox.listFiles('.');
      expect(filesAfterDelete.some(({ name }) => name === filename)).toBe(false);
    }, 20000);

    test('append to file', async () => {
      sandbox = await Sandbox.create(provider);

      const filename = 'append_test.txt';
      const originalContent = 'Hello';
      const appendContent = ' World';

      await sandbox.writeFile(filename, originalContent);
      const currentContent = await sandbox.readFile(filename);
      await sandbox.writeFile(filename, currentContent + appendContent);

      const finalContent = await sandbox.readFile(filename);
      expect(finalContent).toBe(originalContent + appendContent);
    });

    test('verify file exists after creation', async () => {
      sandbox = await Sandbox.create(provider);

      const filename = 'existence_test.txt';
      const content = `Hello from ${provider} sandbox!`;

      await sandbox.writeFile(filename, content);
      const files = await sandbox.listFiles('.');
      const fileExists = files.some(({ name }) => name === filename);
      expect(fileExists).toBe(true);
    });

    // Environment variables
    test(`create ${provider} sandbox with custom environment variables`, async () => {
      const customEnvs = {
        TEST_VAR: 'test_value',
        NODE_ENV: 'testing',
        CUSTOM_KEY: 'custom_value'
      };

      sandbox = await Sandbox.create(provider, {
        envs: customEnvs
      });

      expect(sandbox).toBeDefined();
      expect(sandbox.id()).toBeDefined();

      // Verify environment variables are set
      const testVarResult = await sandbox.runCommand('echo $TEST_VAR');
      expect(testVarResult.trim()).toBe('test_value');

      const nodeEnvResult = await sandbox.runCommand('echo $NODE_ENV');
      expect(nodeEnvResult.trim()).toBe('testing');

      const customKeyResult = await sandbox.runCommand('echo $CUSTOM_KEY');
      expect(customKeyResult.trim()).toBe('custom_value');
    }, 30000);

    // Delete sandbox
    test(`delete ${provider} sandbox`, async () => {
      sandbox = await Sandbox.create(provider);
      const sandboxId = sandbox.id();
      expect(sandboxId).toBeDefined();

      await sandbox.destroy();

      expect(() => sandbox.id()).toThrow('Sandbox not connected');
      sandbox = undefined;
    });
  });
});
