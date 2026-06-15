import { Room } from "../room/room.js";
import { Store } from "../store/store.js";

export class RoomService {
    constructor(private store: Store) {}

    async createRoom(): Promise<Room> {
        const room = new Room()
        await this.store.createRoom(room)
        return room
    }

    async getRoom(roomID: string): Promise<Room | null> {
        return this.store.getRoom(roomID)
    }
}