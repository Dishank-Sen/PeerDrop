import { Room } from "../room/room.js";
export class RoomService {
    store;
    constructor(store) {
        this.store = store;
    }
    async createRoom() {
        const room = new Room();
        await this.store.createRoom(room);
        return room;
    }
    async getRoom(roomID) {
        return this.store.getRoom(roomID);
    }
}
