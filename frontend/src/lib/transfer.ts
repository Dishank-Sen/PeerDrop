import { WebRTCManager } from './webrtc'
import { FileDB } from './db'

const CHUNK_SIZE = 64 * 1024 // 64KB

export interface FileMetadata {
  fileID: string
  name: string
  size: number
  totalChunks: number
}

export interface FileTransfer {
  fileID: string
  name: string
  size: number
  totalChunks: number
  receivedChunks: number
  progress: number
}

export interface PeerTransferProgress {
  peerID: string
  fileID: string
  fileName: string
  totalChunks: number
  sentChunks: number
  progress: number
}

type TransferProgressHandler = (progress: PeerTransferProgress) => void
type IncomingProgressHandler = (transfer: FileTransfer) => void
type FileReceivedHandler = (file: FileTransfer) => void
type TransferCompleteHandler = (fileID: string, peerID: string) => void

export class FileTransferManager {
  private webrtc: WebRTCManager
  private db: FileDB

  private incomingTransfers = new Map<string, FileTransfer>()
  private outgoingTransfers = new Map<string, Map<string, PeerTransferProgress>>()

  private transferProgressHandler: TransferProgressHandler | null = null
  private incomingProgressHandler: IncomingProgressHandler | null = null
  private fileReceivedHandler: FileReceivedHandler | null = null
  private transferCompleteHandler: TransferCompleteHandler | null = null

  private pendingChunkData: Map<string, any> = new Map()
  private chunkSenders: Map<string, string> = new Map() // fileID-index -> peerID

  constructor(webrtc: WebRTCManager, db: FileDB, _localUserID: string) {
    this.webrtc = webrtc
    this.db = db

    this.webrtc.onDataChannelMessage((peerID, data) => {
      this.handleMessage(peerID, data)
    })
  }

  onTransferProgress(handler: TransferProgressHandler) {
    this.transferProgressHandler = handler
  }

  onIncomingProgress(handler: IncomingProgressHandler) {
    this.incomingProgressHandler = handler
  }

  onFileReceived(handler: FileReceivedHandler) {
    this.fileReceivedHandler = handler
  }

  onTransferComplete(handler: TransferCompleteHandler) {
    this.transferCompleteHandler = handler
  }

  private async handleMessage(peerID: string, data: any) {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data)
        console.log(`[Transfer] Received message from ${peerID}:`, msg.type)

        switch (msg.type) {
          case 'file-init':
            console.log(`[Transfer] File init:`, msg)
            await this.handleFileInit(peerID, msg)
            break
          case 'file-resume':
            console.log(`[Transfer] File resume:`, msg)
            await this.handleFileResume(peerID, msg)
            break
          case 'chunk-meta':
            this.handleChunkMeta(peerID, msg)
            break
          case 'chunk-ack':
            this.handleChunkAck(peerID, msg)
            break
        }
      } catch (error) {
        console.error('[Transfer] Failed to parse message:', error)
      }
    } else if (data instanceof ArrayBuffer) {
      console.log(`[Transfer] Received chunk data: ${data.byteLength} bytes`)
      await this.handleChunkData(data)
    }
  }

  private async handleFileInit(peerID: string, msg: any) {
    const { fileID, name, size, totalChunks } = msg

    console.log(`[Transfer] Handling file-init from ${peerID}: ${name} (${totalChunks} chunks)`)

    const transfer: FileTransfer = {
      fileID,
      name,
      size,
      totalChunks,
      receivedChunks: 0,
      progress: 0
    }

    this.incomingTransfers.set(fileID, transfer)

    const storedIndices = await this.db.getStoredChunkIndices(fileID, totalChunks)
    const fromChunk = storedIndices.length

    transfer.receivedChunks = storedIndices.length
    transfer.progress = (storedIndices.length / totalChunks) * 100

    console.log(`[Transfer] Sending file-resume to ${peerID}: fromChunk=${fromChunk}`)
    this.webrtc.sendToPeer(peerID, JSON.stringify({
      type: 'file-resume',
      fileID,
      fromChunk
    }))
  }

  private handleChunkMeta(peerID: string, msg: any) {
    // Store metadata for next ArrayBuffer
    this.pendingChunkData.set('current-meta', msg)
    // Track which peer is sending this chunk
    const key = `${msg.fileID}-${msg.index}`
    this.chunkSenders.set(key, peerID)
  }

  private async handleChunkData(data: ArrayBuffer) {
    const meta = this.pendingChunkData.get('current-meta')
    if (!meta) {
      console.error('[Transfer] Received chunk data without metadata')
      return
    }

    const { fileID, index } = meta
    this.pendingChunkData.delete('current-meta')

    // Get the peer who sent this chunk
    const key = `${fileID}-${index}`
    const senderPeerID = this.chunkSenders.get(key)
    this.chunkSenders.delete(key)

    if (!senderPeerID) {
      console.error('[Transfer] Cannot find sender for chunk', fileID, index)
      return
    }

    console.log(`[Transfer] Saving chunk ${index} and sending ACK to ${senderPeerID}`)

    await this.db.saveChunk(fileID, index, data)

    const transfer = this.incomingTransfers.get(fileID)
    if (transfer) {
      transfer.receivedChunks++
      transfer.progress = (transfer.receivedChunks / transfer.totalChunks) * 100

      console.log(`[Transfer] Receiving progress: ${transfer.receivedChunks}/${transfer.totalChunks} (${transfer.progress.toFixed(1)}%)`)

      // Update UI with incoming progress
      if (this.incomingProgressHandler) {
        this.incomingProgressHandler(transfer)
      }

      // Send ACK back to the sender
      this.webrtc.sendToPeer(senderPeerID, JSON.stringify({
        type: 'chunk-ack',
        fileID,
        index
      }))

      if (transfer.receivedChunks === transfer.totalChunks) {
        console.log(`[Transfer] All chunks received, assembling file`)
        await this.assembleFile(transfer)
      }
    }
  }

  private handleChunkAck(peerID: string, msg: any) {
    const { fileID, index } = msg

    console.log(`[Transfer] Received chunk-ack from ${peerID} for chunk ${index}`)

    const peerTransfers = this.outgoingTransfers.get(fileID)
    if (peerTransfers) {
      const progress = peerTransfers.get(peerID)
      if (progress) {
        progress.sentChunks = index + 1 // ACK for chunk N means N+1 chunks sent
        progress.progress = (progress.sentChunks / progress.totalChunks) * 100

        console.log(`[Transfer] Progress update: ${progress.sentChunks}/${progress.totalChunks} (${progress.progress.toFixed(1)}%)`)

        if (this.transferProgressHandler) {
          this.transferProgressHandler(progress)
        }

        // Check if transfer is complete
        if (progress.sentChunks === progress.totalChunks) {
          console.log(`[Transfer] Transfer complete to ${peerID}`)
          if (this.transferCompleteHandler) {
            this.transferCompleteHandler(fileID, peerID)
          }
        }

        const progressKey = `progress-${peerID}-${fileID}`
        localStorage.setItem(progressKey, index.toString())
      }
    }
  }

  private async handleFileResume(peerID: string, msg: any) {
    const { fileID, fromChunk } = msg

    const peerTransfers = this.outgoingTransfers.get(fileID)
    if (peerTransfers) {
      const progress = peerTransfers.get(peerID)
      if (progress) {
        await this.sendChunks(peerID, fileID, fromChunk)
      }
    }
  }

  async sendFile(file: File, peerIDs: string[]) {
    const fileID = crypto.randomUUID()
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)

    console.log(`[Transfer] Sending file: ${file.name} (${file.size} bytes, ${totalChunks} chunks) to ${peerIDs.length} peer(s)`)

    const peerTransfers = new Map<string, PeerTransferProgress>()

    for (const peerID of peerIDs) {
      const progress: PeerTransferProgress = {
        peerID,
        fileID,
        fileName: file.name,
        totalChunks,
        sentChunks: 0,
        progress: 0
      }
      peerTransfers.set(peerID, progress)

      const initMessage = {
        type: 'file-init',
        fileID,
        name: file.name,
        size: file.size,
        totalChunks
      }
      console.log(`[Transfer] Sending file-init to ${peerID}:`, initMessage)
      this.webrtc.sendToPeer(peerID, JSON.stringify(initMessage))
    }

    this.outgoingTransfers.set(fileID, peerTransfers)

    // Store file for chunking
    ;(window as any)[`file-${fileID}`] = file
    console.log(`[Transfer] File stored with ID: ${fileID}`)
  }

  private async sendChunks(peerID: string, fileID: string, fromChunk: number) {
    const file = (window as any)[`file-${fileID}`] as File
    if (!file) {
      console.error('[Transfer] File not found for sending:', fileID)
      return
    }

    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    console.log(`[Transfer] Starting to send chunks to ${peerID}: ${fromChunk} to ${totalChunks - 1}`)

    for (let i = fromChunk; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, file.size)
      const chunk = await file.slice(start, end).arrayBuffer()

      console.log(`[Transfer] Sending chunk ${i}/${totalChunks - 1} (${chunk.byteLength} bytes) to ${peerID}`)

      this.webrtc.sendToPeer(peerID, JSON.stringify({
        type: 'chunk-meta',
        fileID,
        index: i
      }))

      await new Promise(resolve => setTimeout(resolve, 10))
      this.webrtc.sendToPeer(peerID, chunk)

      // Wait for ACK or timeout
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    console.log(`[Transfer] Finished sending all chunks to ${peerID}`)
  }

  private async assembleFile(transfer: FileTransfer) {
    const chunks: ArrayBuffer[] = []

    for (let i = 0; i < transfer.totalChunks; i++) {
      const chunk = await this.db.getChunk(transfer.fileID, i)
      if (chunk) {
        chunks.push(chunk)
      }
    }

    const blob = new Blob(chunks)
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = transfer.name
    a.click()

    URL.revokeObjectURL(url)

    if (this.fileReceivedHandler) {
      this.fileReceivedHandler(transfer)
    }

    await this.db.deleteFileChunks(transfer.fileID, transfer.totalChunks)
    this.incomingTransfers.delete(transfer.fileID)
  }

}
