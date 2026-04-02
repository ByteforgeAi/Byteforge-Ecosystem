import nodemailer from "nodemailer"

export interface AlertConfig {
  email?: {
    host: string
    port: number
    user: string
    pass: string
    from: string
    to: string[]
    secure?: boolean
  }
  console?: boolean
}

export interface AlertSignal {
  title: string
  message: string
  level: "info" | "warning" | "critical"
  timestamp?: number
  metadata?: Record<string, unknown>
}

export class AlertService {
  constructor(private cfg: AlertConfig) {}

  private async sendEmail(signal: AlertSignal) {
    if (!this.cfg.email) return
    const { host, port, user, pass, from, to, secure } = this.cfg.email
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: secure ?? false,
      auth: { user, pass },
    })
    await transporter.sendMail({
      from,
      to,
      subject: `[${signal.level.toUpperCase()}] ${signal.title}`,
      text: `${signal.message}\n\n${signal.timestamp ? `Timestamp: ${new Date(signal.timestamp).toISOString()}` : ""}`,
    })
  }

  private logConsole(signal: AlertSignal) {
    if (!this.cfg.console) return
    const ts = signal.timestamp ? new Date(signal.timestamp).toISOString() : new Date().toISOString()
    console.log(
      `[Alert][${signal.level.toUpperCase()}] ${signal.title} @ ${ts}\n${signal.message}`
    )
    if (signal.metadata) {
      console.log("Metadata:", JSON.stringify(signal.metadata, null, 2))
    }
  }

  async dispatch(signals: AlertSignal[]) {
    for (const sig of signals) {
      const enriched: AlertSignal = {
        ...sig,
        timestamp: sig.timestamp ?? Date.now(),
      }
      try {
        await this.sendEmail(enriched)
      } catch (err) {
        console.error("Failed to send email alert:", err)
      }
      this.logConsole(enriched)
    }
  }
}
