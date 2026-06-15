import { connections } from "./index.js"
import { userService } from "../service/index.js"

export async function broadcastToRoom(
  roomID: string,
  msg: object,
  excludeUserID?: string
) {
  const peers = await userService.getAllUsersInRoom(roomID)

  peers.forEach(peer => {
    if (peer.id === excludeUserID) return

    const ws = connections.get(peer.id)
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  })
}