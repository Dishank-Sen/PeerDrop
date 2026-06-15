const DB_NAME = 'filemesh'
const STORE_NAME = 'chunks'

export class FileDB {
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
    })
  }

  async saveChunk(fileID: string, index: number, chunk: ArrayBuffer): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const key = `${fileID}-${index}`

      const request = store.put(chunk, key)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async getChunk(fileID: string, index: number): Promise<ArrayBuffer | null> {
    if (!this.db) throw new Error('Database not initialized')

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const key = `${fileID}-${index}`

      const request = store.get(key)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result || null)
    })
  }

  async getStoredChunkIndices(fileID: string, totalChunks: number): Promise<number[]> {
    const indices: number[] = []

    for (let i = 0; i < totalChunks; i++) {
      const chunk = await this.getChunk(fileID, i)
      if (chunk) {
        indices.push(i)
      }
    }

    return indices
  }

  async deleteFileChunks(fileID: string, totalChunks: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    const tx = this.db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    for (let i = 0; i < totalChunks; i++) {
      store.delete(`${fileID}-${i}`)
    }
  }
}
