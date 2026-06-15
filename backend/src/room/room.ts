import type { User } from "../user/user.js"
import type { File } from "../file/file.js"
import { randomBytes } from "crypto"

export class Room {
    id: string
    users: User[]
    createdAt: number
    lastActive: number
    files: File[]

    constructor(){
        this.id = randomBytes(8).toString('hex')
        this.createdAt = Date.now()
        this.lastActive = this.createdAt
        this.users = []
        this.files = []
    }
}