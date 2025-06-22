/**
 * Base class for all sandbox implementations.
 * Provides common functionality and enforces the UnifiedSandbox interface.
 */
export class BaseSandbox {
  protected sandbox: any; // This will be set by the concrete implementation

  /**
   * Connects to an existing sandbox
   * @param id The ID of the sandbox to connect to
   * @returns A new instance of the sandbox connected to the specified ID
   */
  static async connect<T extends BaseSandbox>(this: new () => T, id: string): Promise<T> {
    const instance = new this();
    await instance.initialize(id);
    return instance;
  }

  /**
   * Creates a new sandbox
   * @returns A new instance of the sandbox
   */
  static async create<T extends BaseSandbox>(this: new () => T): Promise<T> {
    const instance = new this();
    await instance.initialize();
    return instance;
  }

  /**
   * Runs a command in the sandbox
   * @param command The command to run
   * @returns The output of the command
   */
  async run(_command: string): Promise<string> {
    throw new Error('Method not implemented');
  }

  /**
   * Gets the ID of the current sandbox
   * @returns The sandbox ID
   * @throws If no sandbox is connected
   */
  id(): string {
    throw new Error('Method not implemented');
  }

  /**
   * Initializes a new sandbox instance
   * @protected
   */
  protected async initialize(_id?: string): Promise<void> {
    throw new Error('Method not implemented');
  }

  /**
   * Pauses the sandbox
   */
  async pause(): Promise<void> {
    throw new Error('Method not implemented');
  }

  async resume(): Promise<void> {
    throw new Error('Method not implemented');
  }

  /**
   * Stops and destroys the sandbox
   */
  async destroy(): Promise<void> {
    throw new Error('Method not implemented');
  }
}
