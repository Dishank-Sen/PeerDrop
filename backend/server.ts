import express from "express"
import { WebSocketServer } from "ws"
import http from "http"
import dotenv from "dotenv/config"
import cors from "cors"
import { randomBytes } from "crypto"
import roomRoutes from "./src/routes/room.routes.js"
import { connectRedis } from "./src/connect/redis.js"
import { handleUpgrade, setupWebSocket } from "./src/ws/index.js"

const app = express()
const server = http.createServer(app)
const port = process.env.PORT || 3000

await connectRedis()

app.use(cors())
app.use(express.json())
app.use('/room', roomRoutes)

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (req, socket, head) => {
  handleUpgrade(wss, req, socket, head)
})

setupWebSocket(wss) // register connection handler

server.listen(port, () => {
    console.log("server running on port ", port)
})