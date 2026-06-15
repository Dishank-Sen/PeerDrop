import { randomBytes } from "crypto";
export class User {
    name;
    id;
    createdAt;
    constructor(name) {
        this.name = name;
        this.id = randomBytes(8).toString('hex');
        this.createdAt = Date.now();
    }
}
