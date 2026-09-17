export class NotFoundError extends Error {
  readonly entity: string;
  readonly id: string;
  constructor(entity: string, id: string) {
    super(`${entity} ${id} not found`);
    this.name = 'NotFoundError';
    this.entity = entity;
    this.id = id;
  }
}

export class InvariantViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantViolationError';
  }
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

export class UntrustedFrameError extends Error {
  readonly channel: string;
  readonly senderUrl: string;
  constructor(channel: string, senderUrl: string) {
    super(`IPC call to ${channel} from untrusted frame: ${senderUrl}`);
    this.name = 'UntrustedFrameError';
    this.channel = channel;
    this.senderUrl = senderUrl;
  }
}
