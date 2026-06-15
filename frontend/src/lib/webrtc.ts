import { WSClient } from './ws'

const ICE_SERVERS = [{ urls: 'stun:stun.google.com:19302' }]

export type DataChannelMessageHandler = (peerID: string, data: any) => void
export type PeerStateChangeHandler = (peerID: string, state: string) => void

interface PeerConnection {
  pc: RTCPeerConnection
  dataChannel: RTCDataChannel | null
}

export class WebRTCManager {
  private wsClient: WSClient
  private connections = new Map<string, PeerConnection>()
  private messageHandler: DataChannelMessageHandler | null = null
  private peerStateHandler: PeerStateChangeHandler | null = null
  private localUserID: string

  constructor(wsClient: WSClient, localUserID: string) {
    this.wsClient = wsClient
    this.localUserID = localUserID
  }

  onDataChannelMessage(handler: DataChannelMessageHandler) {
    this.messageHandler = handler
  }

  onPeerStateChange(handler: PeerStateChangeHandler) {
    this.peerStateHandler = handler
  }

  async handleRoomPeers(peers: string[]) {
    for (const peerID of peers) {
      // Only initiate if we should be the polite peer
      if (this.shouldInitiate(peerID)) {
        await this.initiateConnection(peerID)
      } else {
        console.log(`[WebRTC] Waiting for ${peerID} to initiate (polite peer)`)
      }
    }
  }

  async handlePeerJoined(peerID: string) {
    // Only initiate if we should be the polite peer
    if (this.shouldInitiate(peerID)) {
      await this.initiateConnection(peerID)
    } else {
      console.log(`[WebRTC] Waiting for ${peerID} to initiate (polite peer)`)
    }
  }

  private shouldInitiate(peerID: string): boolean {
    // Use string comparison to determine who initiates
    // The peer with the "smaller" ID always initiates
    return this.localUserID < peerID
  }

  handlePeerLeft(peerID: string) {
    this.closeConnection(peerID)
  }

  async handleSignal(fromID: string, data: any) {
    console.log(`[WebRTC] Received signal from ${fromID}:`, data.type || 'ice-candidate')
    let conn = this.connections.get(fromID)

    if (data.type === 'offer') {
      if (!conn) {
        console.log(`[WebRTC] Creating peer connection for ${fromID} (answering peer)`)
        conn = this.createPeerConnection(fromID, false)
      }

      // Check if we're in a valid state to set remote description
      const state = conn.pc.signalingState
      console.log(`[WebRTC] Current signaling state for ${fromID}: ${state}`)

      if (state !== 'stable' && state !== 'have-local-offer') {
        console.warn(`[WebRTC] Cannot set remote offer in state ${state}, ignoring`)
        return
      }

      try {
        console.log(`[WebRTC] Setting remote description (offer) for ${fromID}`)
        await conn.pc.setRemoteDescription(new RTCSessionDescription(data))
        const answer = await conn.pc.createAnswer()
        await conn.pc.setLocalDescription(answer)

        console.log(`[WebRTC] Sending answer to ${fromID}`)
        this.wsClient.send({
          type: 'signal',
          targetID: fromID,
          data: conn.pc.localDescription
        })
      } catch (error) {
        console.error(`[WebRTC] Error handling offer from ${fromID}:`, error)
      }
    } else if (data.type === 'answer') {
      if (conn) {
        try {
          console.log(`[WebRTC] Setting remote description (answer) for ${fromID}`)
          await conn.pc.setRemoteDescription(new RTCSessionDescription(data))
        } catch (error) {
          console.error(`[WebRTC] Error setting remote answer for ${fromID}:`, error)
        }
      } else {
        console.warn(`[WebRTC] Received answer but no connection exists for ${fromID}`)
      }
    } else if (data.candidate) {
      if (conn) {
        try {
          console.log(`[WebRTC] Adding ICE candidate for ${fromID}`)
          await conn.pc.addIceCandidate(new RTCIceCandidate(data))
        } catch (error) {
          console.error(`[WebRTC] Error adding ICE candidate for ${fromID}:`, error)
        }
      } else {
        console.warn(`[WebRTC] Received ICE candidate but no connection exists for ${fromID}`)
      }
    }
  }

  private async initiateConnection(peerID: string) {
    if (this.connections.has(peerID)) {
      console.log(`[WebRTC] Connection already exists for ${peerID}, skipping`)
      return
    }

    console.log(`[WebRTC] Initiating connection to ${peerID}`)
    const conn = this.createPeerConnection(peerID, true)
    const offer = await conn.pc.createOffer()
    await conn.pc.setLocalDescription(offer)

    console.log(`[WebRTC] Sending offer to ${peerID}`)
    this.wsClient.send({
      type: 'signal',
      targetID: peerID,
      data: conn.pc.localDescription
    })
  }

  private createPeerConnection(peerID: string, isInitiator: boolean): PeerConnection {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    let dataChannel: RTCDataChannel | null = null

    if (isInitiator) {
      dataChannel = pc.createDataChannel('filemesh')
      this.setupDataChannel(dataChannel, peerID)
    }

    pc.ondatachannel = (event) => {
      console.log(`[WebRTC] ondatachannel event for ${peerID}`)
      dataChannel = event.channel
      this.setupDataChannel(dataChannel, peerID)
      // Update the connection with the new dataChannel
      const conn = this.connections.get(peerID)
      if (conn) {
        conn.dataChannel = dataChannel
        console.log(`[WebRTC] Updated dataChannel for ${peerID}`)
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.wsClient.send({
          type: 'signal',
          targetID: peerID,
          data: event.candidate
        })
      }
    }

    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerID} connection state: ${pc.connectionState}`)
      if (this.peerStateHandler) {
        this.peerStateHandler(peerID, pc.connectionState)
      }

      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closeConnection(peerID)
      }
    }

    const conn: PeerConnection = { pc, dataChannel }
    this.connections.set(peerID, conn)

    return conn
  }

  private setupDataChannel(channel: RTCDataChannel, peerID: string) {
    channel.binaryType = 'arraybuffer'

    console.log(`[DataChannel] Setting up channel for ${peerID}, initial state: ${channel.readyState}`)

    channel.onopen = () => {
      console.log(`[DataChannel] ✓ OPENED with peer ${peerID}`)
      if (this.peerStateHandler) {
        this.peerStateHandler(peerID, 'connected')
      }
    }

    channel.onclose = () => {
      console.log(`[DataChannel] Closed with peer ${peerID}`)
    }

    channel.onerror = (error) => {
      console.error(`[DataChannel] Error with peer ${peerID}:`, error)
    }

    channel.onmessage = (event) => {
      if (this.messageHandler) {
        this.messageHandler(peerID, event.data)
      }
    }
  }

  private closeConnection(peerID: string) {
    const conn = this.connections.get(peerID)
    if (conn) {
      if (conn.dataChannel) {
        conn.dataChannel.close()
      }
      conn.pc.close()
      this.connections.delete(peerID)
    }
  }

  sendToPeer(peerID: string, data: any) {
    const conn = this.connections.get(peerID)
    if (!conn) {
      console.error(`Cannot send to peer ${peerID}: no connection`)
      return
    }

    if (!conn.dataChannel) {
      console.error(`Cannot send to peer ${peerID}: dataChannel is null`)
      return
    }

    const state = conn.dataChannel.readyState
    console.log(`[DataChannel] Attempting to send to ${peerID}, state: ${state}`)

    if (state === 'open') {
      if (typeof data === 'string') {
        conn.dataChannel.send(data)
        console.log(`[DataChannel] Sent string message to ${peerID}`)
      } else {
        conn.dataChannel.send(data)
        console.log(`[DataChannel] Sent binary data (${data.byteLength} bytes) to ${peerID}`)
      }
    } else {
      console.error(`Cannot send to peer ${peerID}: channel state is ${state}, not open`)
    }
  }

  cleanup() {
    for (const [peerID] of this.connections) {
      this.closeConnection(peerID)
    }
  }
}
