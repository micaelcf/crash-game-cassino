import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OutboxPublisher } from './outbox.publisher';
import { OutboxEvent } from './outbox-event.entity';

const newEvent = (data: Partial<OutboxEvent> = {}): OutboxEvent => {
  const e = Object.create(OutboxEvent.prototype) as OutboxEvent;
  Object.assign(e, {
    id: crypto.randomUUID(),
    eventType: 'bet.placed',
    aggregateType: 'Bet',
    aggregateId: 'bet-1',
    payload: {},
    createdAt: new Date(),
    publishedAt: null,
    attempts: 0,
    ...data,
  });
  return e;
};

const makeRepo = (rows: OutboxEvent[]) => ({
  find: vi.fn().mockResolvedValue(rows),
  flush: vi.fn().mockResolvedValue(undefined),
});

const makePublisher = () => ({
  publish: vi.fn().mockResolvedValue(undefined),
});

const fakeOrm = {} as any;

describe('OutboxPublisher (games)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('publishes bet.placed events with the right routing key and marks them as published', async () => {
    const evt = newEvent({
      payload: { userId: 'p1', betAmount: '1000', roundId: 'r1' },
    });
    const repo = makeRepo([evt]);
    const publisher = makePublisher();
    const sut = new OutboxPublisher(
      fakeOrm,
      repo as any,
      publisher as any,
      'crash.events',
    );

    await sut.drain();

    expect(publisher.publish).toHaveBeenCalledWith(
      'crash.events',
      'bet.placed',
      { userId: 'p1', betAmount: '1000', roundId: 'r1' },
      expect.objectContaining({ messageId: evt.id, persistent: true }),
    );
    expect(evt.publishedAt).toBeInstanceOf(Date);
    expect(repo.flush).toHaveBeenCalled();
  });

  it('records the attempt and leaves the event unpublished when broker rejects', async () => {
    const evt = newEvent({ eventType: 'player.won' });
    const repo = makeRepo([evt]);
    const publisher = { publish: vi.fn().mockRejectedValue(new Error('nack')) };
    const sut = new OutboxPublisher(
      fakeOrm,
      repo as any,
      publisher as any,
      'crash.events',
    );

    await sut.drain();

    expect(evt.publishedAt).toBeNull();
    expect(evt.attempts).toBe(1);
    expect(repo.flush).toHaveBeenCalled();
  });
});
