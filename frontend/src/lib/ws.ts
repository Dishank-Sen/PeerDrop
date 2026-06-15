type MessageHandler = (data: any) => void

export class WSClient {
  private ws: WebSocket | null = null
  private roomID: string
  private userID: string
  private wsURL: string
  private messageHandler: MessageHandler | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private reconnectDelay = 1000
  private shouldReconnect = true

  constructor(roomID: string, userID: string, wsURL: string) {
    this.roomID = roomID
    this.userID = userID
    this.wsURL = wsURL
  }

  connect() {
    const url = `${this.wsURL}?roomID=${this.roomID}&userID=${this.userID}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.reconnectDelay = 1000
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('[WS] Message received:', data)
        if (this.messageHandler) {
          this.messageHandler(data)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = (event) => {
      console.log('WebSocket closed', { code: event.code, reason: event.reason, wasClean: event.wasClean })
      this.ws = null

      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000)
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        setTimeout(() => this.connect(), delay)
      }
    }
  }

  onMessage(handler: MessageHandler) {
    this.messageHandler = handler
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.error('WebSocket not connected')
    }
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}
