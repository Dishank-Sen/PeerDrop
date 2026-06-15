import { randomBytes } from "crypto";
export class File {
    id;
    name;
    size;
    uploadedBy;
    uploadedAt;
    constructor(name, size, uploadedBy) {
        this.id = randomBytes(8).toString('hex');
        this.name = name;
        this.size = size;
        this.uploadedBy = uploadedBy;
        this.uploadedAt = Date.now();
    }
}
