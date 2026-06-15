import type { Room } from "../room/room.js"
import type { User } from "../user/user.js"

export interface Store {
    createRoom(room: Room): Promise<void>
    getRoom(roomId: string): Promise<Room | null>
    deleteRoom(roomId: string): Promise<void>
    
    addUserToRoom(roomId: string, user: User): Promise<void>
    removeUserFromRoom(roomId: string, userId: string): Promise<void>
    getUserCount(roomId: string): Promise<number>
    userBelongToRoom(roomID: string, userID: string): Promise<boolean>
    getAllUsersInRoom(roomID: string): Promise<User[]>

    addFileToRoom(roomId: string, file: File): Promise<void>
    removeFileFromRoom(roomId: string, fileId: string): Promise<void>
}