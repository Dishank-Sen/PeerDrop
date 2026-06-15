import { Router } from "express"
import { RoomController } from "../controllers/room.controller.js"
import { roomService, userService } from "../service/index.js"

const router = Router()
const roomController = new RoomController(roomService, userService)

router.post("/", roomController.createRoom)
router.post("/:roomID/join", roomController.joinRoom)
router.post("/:roomID/leave", roomController.leaveRoom)

export default router