import { AppWebSocket, connections } from "./index.js"
import { userService } from "../service/index.js"
import { broadcastToRoom } from "./broadcast.js"

export async function handleNodeLeave(ws: AppWebSocket) {
  const { roomID, userID } = ws

  // remove from connections map
  connections.delete(userID)

  // remove from Redis
  await userService.removeUserFromRoom(roomID, userID)

  // notify others
  await broadcastToRoom(roomID, { type: 'peer-left', peerID: userID })
}
