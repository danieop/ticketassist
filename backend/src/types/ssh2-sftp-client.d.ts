declare module "ssh2-sftp-client" {
  type ConnectConfig = {
    host: string;
    port?: number;
    username: string;
    password?: string;
    readyTimeout?: number;
  };

  export default class SftpClient {
    constructor(name?: string);
    connect(config: ConnectConfig): Promise<void>;
    end(): Promise<void>;
    mkdir(remotePath: string, recursive?: boolean): Promise<string>;
    put(input: Buffer, remotePath: string): Promise<string>;
    get(remotePath: string): Promise<Buffer | string>;
  }
}
