import { Provider, providers, providerRegistry } from "./providers/index.js";

export type FileEntry = {
  type: "directory" | "file";
  name: string;
};

export abstract class Sandbox {
  // Create a new sandbox instance
  static async create(provider: Provider) {
    const instance = new providerRegistry[provider]();
    await instance.init();
    return instance;
  }

  // Connect to an existing sandbox instance
  static async connect(provider: Provider, id: string) {
    const instance = new providerRegistry[provider]();
    await instance.init(id);
    return instance;
  }

  // Get the list of available providers
  static getProvidersList(): Array<Provider> {
    return providers;
  }

  // Create a new sandbox or connect to an existing one
  protected abstract init(id?: string): Promise<void>;

  // Execute a command in the sandbox and return its output
  abstract run(command: string): Promise<string>;

  // Get the sandbox ID
  abstract id(): string;

  // Pause the sandbox
  abstract suspend(): Promise<void>;

  // Resume the sandbox
  abstract resume(): Promise<void>;

  // Stop and destroy the sandbox
  abstract destroy(): Promise<void>;

  // File operations
  abstract readFile(path: string): Promise<string>;
  abstract writeFile(path: string, content: string): Promise<void>;
  abstract listFiles(path: string): Promise<Array<FileEntry>>;
  abstract moveFile(path: string, newPath: string): Promise<void>;
  abstract deleteFile(path: string): Promise<void>;
  abstract createDirectory(path: string): Promise<void>;

  // Preview URL
  abstract getPreviewUrl(port: number): Promise<string>;

  // Terminal operations
  abstract createTerminal(
    onOutput: (output: string) => void
  ): Promise<Terminal>;
}

export abstract class Terminal {
  abstract write(data: string): Promise<void>;
  abstract resize(cols: number, rows: number): Promise<void>;
  abstract kill(): Promise<void>;
}
