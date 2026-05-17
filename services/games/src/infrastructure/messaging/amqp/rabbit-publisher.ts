export interface RabbitPublisher {
  publish(
    exchange: string,
    routingKey: string,
    payload: unknown,
    options: { messageId: string; persistent?: boolean },
  ): Promise<void>;
}

export const RABBIT_PUBLISHER = Symbol('RABBIT_PUBLISHER');
