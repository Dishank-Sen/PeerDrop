import {randomBytes} from "crypto"

export class User {
    name: string
    id: string
    createdAt: number

    constructor(name: string){
        this.name = name
        this.id = randomBytes(8).toString('hex')
        this.createdAt = Date.now()
    }
}