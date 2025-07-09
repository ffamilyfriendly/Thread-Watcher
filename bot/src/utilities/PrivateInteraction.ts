type Sender = {
  send: (message: unknown) => void;
};

export class PrivateInteraction {
  sender: Sender;
  request_id: string;

  constructor(sender: Sender, request_id: string) {
    this.sender = sender;
    this.request_id = request_id;
  }

  reply(status: boolean, data: unknown) {
    this.sender.send({ ok: status, request_id: this.request_id, data, type: 'response' });
  }
}
