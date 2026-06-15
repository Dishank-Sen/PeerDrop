import { Store } from "../store/store.js";
import { User } from "../user/user.js";

export class UserService {
    constructor(private store: Store) {}

    async addUserToRoom(roomID: string, name: string): Promise<User> {
        const user = new User(name)
        await this.store.addUserToRoom(roomID, user)
        return user
    }

    async removeUserFromRoom(roomID: string, userID: string): Promise<void> {
        await this.store.removeUserFromRoom(roomID, userID)
        const userCount = await this.store.getUserCount(roomID)
        if(userCount == 0){
            await this.store.deleteRoom(roomID)
        }
    }

    async userBelongToRoom(roomID: string, userID: string): Promise<boolean> {
        return this.store.userBelongToRoom(roomID, userID)
    }

    async getAllUsersInRoom(roomID: string): Promise<User[]> {
        return this.store.getAllUsersInRoom(roomID)
    }
}