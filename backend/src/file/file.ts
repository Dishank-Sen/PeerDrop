import type { User } from "../user/user.js"
import {randomBytes} from "crypto"

export class File {
    id: string
    name: string
    size: number
    uploadedBy: User
    uploadedAt: number

    constructor(name: string, size: number, uploadedBy: User){
        this.id = randomBytes(8).toString('hex')
        this.name = name
        this.size = size
        this.uploadedBy = uploadedBy
        this.uploadedAt = Date.now()
    }
}