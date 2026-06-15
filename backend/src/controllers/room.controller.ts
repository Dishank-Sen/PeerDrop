import type { Request, Response} from "express"
import { RoomService } from "../service/room.service.js";
import { UserService } from "../service/user.service.js";

interface JoinRoomParams {
    roomID: string;
}

interface leaveRoomParams {
    roomID: string;
}

export class RoomController {
    constructor(
        private roomService: RoomService,
        private userService: UserService
    ) {}

    createRoom = async (req: Request, res: Response) => {
        try {
            const { name } = req.body
            const room = await this.roomService.createRoom()
            const user = await this.userService.addUserToRoom(room.id, name)
            return res.status(201).json({
                roomID: room.id,
                userID: user.id,
                message: "Room created"
            });
        } catch (error) {
            console.log(error)
            return res.status(500).json({
                message: "Internal Server Error"
            })
        }
    }

    joinRoom = async (req: Request<JoinRoomParams>, res: Response) => {
        try {
            const { roomID } = req.params
            if (!/^[a-f0-9]{16}$/.test(roomID)) {
                return res.status(400).json({
                    message: "Invalid room ID"
                });
            }

            const room = this.roomService.getRoom(roomID)
            if(!room){
                return res.status(404).json({
                    message: "Room not found"
                });
            }

            const { name } = req.body
            const user = await this.userService.addUserToRoom(roomID, name)
            return res.status(200).json({
                userID: user.id,
                message: "User Joined"
            });
        } catch (error) {
            console.log(error)
            return res.status(500).json({
                message: "Internal Server Error"
            })
        }
    }

    leaveRoom = async (req: Request<leaveRoomParams>, res: Response) => {
        try {
            const { roomID } = req.params
            if (!/^[a-f0-9]{16}$/.test(roomID)) {
                return res.status(400).json({
                    message: "Invalid room ID"
                });
            }

            const room = this.roomService.getRoom(roomID)
            if(!room){
                return res.status(404).json({
                    message: "Room not found"
                });
            }

            const { userID } = req.body
            await this.userService.removeUserFromRoom(roomID, userID)
            return res.status(200).json({
                message: "Room Leaved"
            });
        } catch (error) {
            console.log(error)
            return res.status(500).json({
                message: "Internal Server Error"
            })
        }
    }
}