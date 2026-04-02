import type { SightCoreMessage } from "./WebSocketClient"

export interface AggregatedSignal {
  topic: string
  count: number
  lastPayload: any
  lastTimestamp: number
  firstTimestamp?: number
  metadata?: Record<string, unknown>
}

export class SignalAggregator {
  private counts: Record<string, AggregatedSignal> = {}

  processMessage(msg: SightCoreMessage): AggregatedSignal {
    const { topic, payload, timestamp } = msg
    const entry =
      this.counts[topic] || {
        topic,
        count: 0,
        lastPayload: null,
        lastTimestamp: 0,
        firstTimestamp: timestamp,
      }

    entry.count += 1
    entry.lastPayload = payload
    entry.lastTimestamp = timestamp
    this.counts[topic] = entry
    return entry
  }

  getAggregated(topic: string): AggregatedSignal | undefined {
    return this.counts[topic]
  }

  getAllAggregated(): AggregatedSignal[] {
    return Object.values(this.counts)
  }

  getTopTopics(limit = 5): AggregatedSignal[] {
    return Object.values(this.counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }

  filterByThreshold(minCount: number): AggregatedSignal[] {
    return Object.values(this.counts).filter((s) => s.count >= minCount)
  }

  removeTopic(topic: string): void {
    delete this.counts[topic]
  }

  reset(): void {
    this.counts = {}
  }
}
