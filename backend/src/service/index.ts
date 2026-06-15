import { RoomService } from "../service/room.service.js"
import { UserService } from "../service/user.service.js"
import { store } from "../store/index.js"

export const roomService = new RoomService(store)
export const userService = new UserService(store)