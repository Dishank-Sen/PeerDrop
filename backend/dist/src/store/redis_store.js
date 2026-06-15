import { Room } from "../room/room.js";
import { User } from "../user/user.js";
export class RedisStore {
    redis;
    constructor(redis) {
        this.redis = redis;
    }
    async createRoom(room) {
        await this.redis.hSet(`room:${room.id}`, {
            id: room.id,
            createdAt: room.createdAt.toString(),
            lastActive: room.lastActive.toString()
        });
    }
    async getRoom(roomID) {
        const data = await this.redis.hGetAll(`room:${roomID}`);
        if (Object.keys(data).length === 0) {
            return null;
        }
        const room = new Room();
        room.id = data.id;
        room.createdAt = Number(data.createdAt);
        room.lastActive = Number(data.lastActive);
        return room;
    }
    async addUserToRoom(roomID, user) {
        await this.redis.sAdd(`room:${roomID}:users`, user.id);
        await this.redis.hSet(`user:${user.id}`, {
            id: user.id,
            name: user.name
        });
    }
    async removeUserFromRoom(roomID, userID) {
        await this.redis.sRem(`room:${roomID}:users`, userID);
        await this.redis.del(`user:${userID}`);
    }
    async getUserCount(roomID) {
        return await this.redis.sCard(`room:${roomID}:users`);
    }
    async deleteRoom(roomID) {
        await this.redis.del(`room:${roomID}`);
    }
    async userBelongToRoom(roomID, userID) {
        const exist = await this.redis.sIsMember(`room:${roomID}:users`, userID);
        return exist == 1;
    }
    async getAllUsersInRoom(roomID) {
        const userIDs = await this.redis.sMembers(`room:${roomID}:users`);
        const userList = [];
        for (const userID of userIDs) {
            const userData = await this.redis.hGetAll(`user:${userID}`);
            if (Object.keys(userData).length > 0) {
                const user = new User(userData.name);
                user.id = userData.id;
                userList.push(user);
            }
        }
        return userList;
    }
    async addFileToRoom(roomID, file) {
    }
    async removeFileFromRoom(roomID, fileId) {
    }
}
