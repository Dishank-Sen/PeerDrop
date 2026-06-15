import { WebSocketServer, WebSocket } from "ws"
import { IncomingMessage } from "http"
import { Duplex } from "stream"
import { redis } from "../connect/redis.js"
import { userService } from "../service/index.js"
import { broadcastToRoom } from "./broadcast.js"
import { handleNodeLeave } from "./handleNodeLeave.js"
import { handleMessage } from "./handleMsg.js"

export interface AppWebSocket extends WebSocket {
  userID: string
  roomID: string
  isAlive: boolean
}

// in-memory socket registry
export const connections = new Map<string, AppWebSocket>()

export function handleUpgrade(
  wss: WebSocketServer,
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer
) {
  const { pathname, searchParams } = new URL(req.url!, `http://localhost`)

  if (pathname !== '/ws') {
    socket.destroy()
    return
  }

  const roomID = searchParams.get('roomID')
  const userID = searchParams.get('userID')

  if (!roomID || !userID) {
    socket.destroy()
    return
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    const appWs = ws as AppWebSocket
    appWs.roomID = roomID
    appWs.userID = userID
    wss.emit('connection', appWs)
  })
}

// separate function so wss is set up once in server.ts and passed here
export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', async (ws: AppWebSocket) => {
    const { roomID, userID } = ws
    console.log(`[WS] New connection: userID=${userID}, roomID=${roomID}`)

    // verify node belongs to this room
    const isMember = await userService.userBelongToRoom(roomID, userID)
    if (!isMember) {
      console.log(`[WS] User ${userID} not a member of room ${roomID}, terminating`)
      ws.terminate()
      return
    }

    ws.isAlive = true
    connections.set(userID, ws)
    console.log(`[WS] User ${userID} added to connections map`)

    // send existing peers to new node
    const peers = await userService.getAllUsersInRoom(roomID)
    const peerIDs = peers.filter(peer => peer.id !== userID).map(peer => peer.id)
    console.log(`[WS] Sending room-peers to ${userID}:`, peerIDs)
    ws.send(JSON.stringify({
      type: 'room-peers',
      peers: peerIDs
    }))

    // notify others
    console.log(`[WS] Broadcasting peer-joined for ${userID}`)
    await broadcastToRoom(roomID, { type: 'peer-joined', peerID: userID }, userID)

    ws.on('pong', () => {
      ws.isAlive = true
      console.log(`[WS] Received pong from ${userID}`)
    })

    ws.on('message', (raw) => handleMessage(ws, raw))

    ws.on('close', () => {
      console.log(`[WS] Connection closed for ${userID}`)
      handleNodeLeave(ws)
    })

    ws.on('error', (error) => {
      console.error(`[WS] WebSocket error for ${userID}:`, error)
    })
  })

  // heartbeat - check every 30 seconds
  setInterval(() => {
    wss.clients.forEach((ws) => {
      const appWs = ws as AppWebSocket
      if (!appWs.isAlive) {
        console.log(`[WS] Heartbeat failed for ${appWs.userID}, terminating`)
        handleNodeLeave(appWs)
        return appWs.terminate()
      }
      appWs.isAlive = false
      appWs.ping()
    })
  }, 30000)
}

// const ws = new WebSocket(`ws://localhost:3000/ws?roomId=${roomId}&nodeId=${getNodeId()}`)