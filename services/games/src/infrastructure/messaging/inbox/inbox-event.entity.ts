import { defineEntity, type InferEntity } from '@mikro-orm/core';

export const InboxEventSchema = defineEntity({
  name: 'InboxEvent',
  tableName: 'inbox_events',
  properties: (p) => ({
    id: p.string().primary(),
    processedAt: p.datetime().onCreate(() => new Date()),
  }),
});

export type IInboxEvent = InferEntity<typeof InboxEventSchema>;

export class InboxEvent extends InboxEventSchema.class {}

InboxEventSchema.setClass(InboxEvent);
