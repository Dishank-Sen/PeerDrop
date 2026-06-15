import { randomBytes } from "crypto";
export class Room {
    id;
    users;
    createdAt;
    lastActive;
    files;
    constructor() {
        this.id = randomBytes(8).toString('hex');
        this.createdAt = Date.now();
        this.lastActive = this.createdAt;
        this.users = [];
        this.files = [];
    }
}
