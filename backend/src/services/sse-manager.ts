import type { Response } from "express";

const clients = new Map<string, Set<Response>>();

export function addClient(userId: string, res: Response) {
  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }

  clients.get(userId)!.add(res);
}

export function removeClient(userId: string, res: Response) {
  const set = clients.get(userId);

  if (!set) {
    return;
  }

  set.delete(res);

  if (set.size === 0) {
    clients.delete(userId);
  }
}

export function sendToUser(userId: string, event: { type: string; data: unknown }) {
  const set = clients.get(userId);

  if (!set) {
    return;
  }

  const payload = `event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;

  for (const res of set) {
    res.write(payload);
  }
}

export function sendToUsers(userIds: string[], event: { type: string; data: unknown }) {
  for (const userId of userIds) {
    sendToUser(userId, event);
  }
}

setInterval(() => {
  for (const set of clients.values()) {
    for (const res of set) {
      res.write(":heartbeat\n\n");
    }
  }
}, 30_000);
