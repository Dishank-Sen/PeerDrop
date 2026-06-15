import { User } from "../user/user.js";
export class UserService {
    store;
    constructor(store) {
        this.store = store;
    }
    async addUserToRoom(roomID, name) {
        const user = new User(name);
        await this.store.addUserToRoom(roomID, user);
        return user;
    }
    async removeUserFromRoom(roomID, userID) {
        await this.store.removeUserFromRoom(roomID, userID);
        const userCount = await this.store.getUserCount(roomID);
        if (userCount == 0) {
            await this.store.deleteRoom(roomID);
        }
    }
    async userBelongToRoom(roomID, userID) {
        return this.store.userBelongToRoom(roomID, userID);
    }
    async getAllUsersInRoom(roomID) {
        return this.store.getAllUsersInRoom(roomID);
    }
}
