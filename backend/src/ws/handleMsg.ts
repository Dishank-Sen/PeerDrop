import type { RawData } from "ws"
import { AppWebSocket, connections } from "./index.js"

export function handleMessage(ws: AppWebSocket, raw: RawData) {
  let msg: any

  // guard against malformed JSON crashing the server
  try {
    msg = JSON.parse(raw.toString())
  } catch {
    ws.send(JSON.stringify({ type: 'error', message: 'invalid JSON' }))
    return
  }

  switch (msg.type) {

    // forward SDP offer/answer and ICE candidates to target peer
    case 'signal': {
      if (!msg.targetID || !msg.data) {
        ws.send(JSON.stringify({ type: 'error', message: 'missing targetID or data' }))
        return
      }

      const targetWs = connections.get(msg.targetID)

      if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'error', message: 'target peer not found' }))
        return
      }

      targetWs.send(JSON.stringify({
        type: 'signal',
        fromID: ws.userID,
        data: msg.data  // SDP or ICE candidate, untouched
      }))
      break
    }

    default: {
      ws.send(JSON.stringify({ type: 'error', message: 'unknown message type' }))
    }
  }
}