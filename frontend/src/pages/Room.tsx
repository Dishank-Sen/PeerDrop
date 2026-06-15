import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { WSClient } from '../lib/ws'
import { WebRTCManager } from '../lib/webrtc'
import { FileTransferManager } from '../lib/transfer'
import type { PeerTransferProgress, FileTransfer } from '../lib/transfer'
import { FileDB } from '../lib/db'
import { leaveRoom } from '../lib/api'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws'

export function Room() {
  const { roomID } = useParams<{ roomID: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [peers, setPeers] = useState<string[]>([])
  const [peerStates, setPeerStates] = useState<Map<string, string>>(new Map())
  const [outgoingProgress, setOutgoingProgress] = useState<Map<string, PeerTransferProgress>>(new Map())
  const [incomingProgress, setIncomingProgress] = useState<Map<string, FileTransfer>>(new Map())
  const [receivedFiles, setReceivedFiles] = useState<FileTransfer[]>([])
  const [sentFiles, setSentFiles] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const wsRef = useRef<WSClient | null>(null)
  const webrtcRef = useRef<WebRTCManager | null>(null)
  const transferRef = useRef<FileTransferManager | null>(null)
  const dbRef = useRef<FileDB | null>(null)

  const userID = searchParams.get('userID')

  useEffect(() => {
    if (!roomID || !userID) {
      console.error('Missing roomID or userID')
      navigate('/')
      return
    }

    const init = async () => {
      const db = new FileDB()
      await db.init()
      dbRef.current = db

      const ws = new WSClient(roomID, userID, WS_URL)
      wsRef.current = ws

      const webrtc = new WebRTCManager(ws, userID)
      webrtcRef.current = webrtc

      const transfer = new FileTransferManager(webrtc, db, userID)
      transferRef.current = transfer

      transfer.onTransferProgress((progress) => {
        setOutgoingProgress(prev => {
          const next = new Map(prev)
          next.set(`${progress.peerID}-${progress.fileID}`, progress)
          return next
        })
      })

      transfer.onIncomingProgress((fileTransfer) => {
        setIncomingProgress(prev => {
          const next = new Map(prev)
          next.set(fileTransfer.fileID, fileTransfer)
          return next
        })
      })

      transfer.onFileReceived((file) => {
        setIncomingProgress(prev => {
          const next = new Map(prev)
          next.delete(file.fileID)
          return next
        })
        setReceivedFiles(prev => [...prev, file])
      })

      transfer.onTransferComplete((fileID, peerID) => {
        console.log(`Transfer complete: ${fileID} to ${peerID}`)
        setOutgoingProgress(prev => {
          const next = new Map(prev)
          next.delete(`${peerID}-${fileID}`)
          return next
        })
        setSentFiles(prev => [...prev, fileID])
        setTimeout(() => {
          setSentFiles(prev => prev.filter(id => id !== fileID))
        }, 5000)
      })

      webrtc.onPeerStateChange((peerID, state) => {
        setPeerStates(prev => {
          const next = new Map(prev)
          next.set(peerID, state)
          return next
        })
      })

      ws.onMessage((data) => {
        console.log('WebSocket message received:', data)
        switch (data.type) {
          case 'room-peers':
            const peerIDs = Array.isArray(data.peers) ? data.peers.map((p: any) => p.id || p) : []
            console.log('Setting peers:', peerIDs)
            setPeers(peerIDs)
            webrtc.handleRoomPeers(peerIDs)
            break
          case 'peer-joined':
            console.log('Peer joined:', data.peerID)
            setPeers(prev => {
              if (prev.includes(data.peerID)) {
                console.log('Peer already exists, skipping')
                return prev
              }
              const newPeers = [...prev, data.peerID]
              console.log('Updated peers after join:', newPeers)
              return newPeers
            })
            webrtc.handlePeerJoined(data.peerID)
            break
          case 'peer-left':
            console.log('Peer left:', data.peerID)
            setPeers(prev => prev.filter(p => p !== data.peerID))
            webrtc.handlePeerLeft(data.peerID)
            break
          case 'signal':
            webrtc.handleSignal(data.fromID, data.data)
            break
        }
      })

      ws.connect()
    }

    init()

    return () => {
      if (wsRef.current) {
        wsRef.current.disconnect()
      }
      if (webrtcRef.current) {
        webrtcRef.current.cleanup()
      }
    }
  }, [roomID, userID])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !transferRef.current) return

    if (peers.length === 0) {
      alert('No peers connected')
      return
    }

    await transferRef.current.sendFile(file, peers)
    e.target.value = ''
  }

  const handleCopyRoomID = async () => {
    if (roomID) {
      await navigator.clipboard.writeText(roomID)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleLeaveRoom = async () => {
    if (roomID && userID) {
      try {
        await leaveRoom(roomID, userID)
      } catch (err) {
        console.error('Failed to leave room:', err)
      }
    }

    if (wsRef.current) {
      wsRef.current.disconnect()
    }
    if (webrtcRef.current) {
      webrtcRef.current.cleanup()
    }

    navigate('/')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-xl border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Peer<span className="text-cyan-400">Drop</span></h1>
                <p className="text-gray-400 text-xs font-mono">P2P Transfer</p>
              </div>
            </div>
            <button
              onClick={handleLeaveRoom}
              className="bg-red-600/90 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 font-mono text-sm border border-red-500/50"
            >
              DISCONNECT
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Room Info & Peers */}
          <div className="lg:col-span-1 space-y-6">
            {/* Room ID Card */}
            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center font-mono uppercase tracking-wider">
                <svg className="w-4 h-4 mr-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Room ID
              </h2>
              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 mb-3">
                <p className="text-xs font-mono text-cyan-400 break-all">{roomID}</p>
              </div>
              <button
                onClick={handleCopyRoomID}
                className={`w-full py-2 px-3 rounded-lg font-medium transition-all duration-200 font-mono text-sm ${
                  copied
                    ? 'bg-emerald-600 text-white border border-emerald-500'
                    : 'bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 border border-cyan-500/30'
                }`}
              >
                {copied ? '✓ COPIED' : 'COPY ID'}
              </button>
            </div>

            {/* Connected Peers Card */}
            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl p-5">
              <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center font-mono uppercase tracking-wider">
                <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Peers ({peers.length})
              </h2>
              {peers.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-700/50 border border-gray-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-xs font-mono">Waiting for peers...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {peers.map(peerID => (
                    <div
                      key={peerID}
                      className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-xs font-mono">{peerID.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <span className="font-mono text-xs text-gray-300">{peerID.slice(0, 8)}...</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-1 rounded font-mono ${
                        peerStates.get(peerID) === 'connected'
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {peerStates.get(peerID) === 'connected' ? 'ONLINE' : 'SYNCING'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - File Transfer */}
          <div className="lg:col-span-3 space-y-6">
            {/* Send Files Card */}
            <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl p-6">
              <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center font-mono uppercase tracking-wider">
                <svg className="w-4 h-4 mr-2 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Send File
              </h2>
              <div className="border-2 border-dashed border-gray-600 hover:border-cyan-500/50 rounded-xl p-8 text-center transition-colors duration-200 bg-gray-900/30">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
                <label
                  htmlFor="file-input"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <div className="w-14 h-14 bg-cyan-600/20 border border-cyan-500/30 rounded-xl flex items-center justify-center mb-3">
                    <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-gray-200 mb-1 font-mono">DROP FILE HERE</p>
                  <p className="text-xs text-gray-500 font-mono">or click to browse</p>
                </label>
              </div>
            </div>

            {/* Sending Files */}
            {outgoingProgress.size > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-xl border border-cyan-500/30 rounded-xl shadow-2xl p-6">
                <h2 className="text-sm font-semibold text-cyan-400 mb-4 flex items-center font-mono uppercase tracking-wider">
                  <svg className="w-4 h-4 mr-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Outgoing Transfer
                </h2>
                <div className="space-y-3">
                  {Array.from(outgoingProgress.values()).map(progress => (
                    <div key={`${progress.peerID}-${progress.fileID}`} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-200 text-sm font-mono">{progress.fileName}</p>
                          <p className="text-xs text-gray-500 font-mono">→ {progress.peerID.slice(0, 8)}</p>
                        </div>
                        <span className="text-sm font-bold text-cyan-400 font-mono">{progress.progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div
                          className="bg-gradient-to-r from-cyan-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">
                        {progress.sentChunks} / {progress.totalChunks} chunks
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Receiving Files */}
            {incomingProgress.size > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-xl border border-blue-500/30 rounded-xl shadow-2xl p-6">
                <h2 className="text-sm font-semibold text-blue-400 mb-4 flex items-center font-mono uppercase tracking-wider">
                  <svg className="w-4 h-4 mr-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Incoming Transfer
                </h2>
                <div className="space-y-3">
                  {Array.from(incomingProgress.values()).map(transfer => (
                    <div key={transfer.fileID} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-200 text-sm font-mono">{transfer.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{formatFileSize(transfer.size)}</p>
                        </div>
                        <span className="text-sm font-bold text-blue-400 font-mono">{transfer.progress.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${transfer.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 font-mono">
                        {transfer.receivedChunks} / {transfer.totalChunks} chunks
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sent Files Success */}
            {sentFiles.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-xl border border-emerald-500/30 rounded-xl shadow-2xl p-6">
                <h2 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center font-mono uppercase tracking-wider">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Transfer Complete
                </h2>
                <div className="space-y-2">
                  {sentFiles.map(fileID => (
                    <div
                      key={fileID}
                      className="bg-emerald-600/10 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between animate-fadeIn"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-600/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-400 text-sm font-mono">FILE SENT</p>
                          <p className="text-xs text-gray-500 font-mono">Transfer successful</p>
                        </div>
                      </div>
                      <span className="bg-emerald-600/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded border border-emerald-500/30 font-mono">
                        ✓ OK
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Received Files */}
            {receivedFiles.length > 0 && (
              <div className="bg-gray-800/50 backdrop-blur-xl border border-emerald-500/30 rounded-xl shadow-2xl p-6">
                <h2 className="text-sm font-semibold text-emerald-400 mb-4 flex items-center font-mono uppercase tracking-wider">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Downloaded Files
                </h2>
                <div className="space-y-2">
                  {receivedFiles.map(file => (
                    <div
                      key={file.fileID}
                      className="bg-emerald-600/10 border border-emerald-500/30 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-600/20 border border-emerald-500/30 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-200 text-sm font-mono">{file.name}</p>
                          <p className="text-xs text-gray-500 font-mono">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <span className="bg-emerald-600/20 text-emerald-400 text-xs font-bold px-3 py-1 rounded border border-emerald-500/30 font-mono">
                        SAVED
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {outgoingProgress.size === 0 && incomingProgress.size === 0 && receivedFiles.length === 0 && sentFiles.length === 0 && (
              <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl border-2 border-dashed border-gray-700 p-12 text-center">
                <div className="w-16 h-16 bg-gray-700/50 border border-gray-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2 font-mono">NO ACTIVE TRANSFERS</h3>
                <p className="text-gray-500 font-mono text-sm">Select a file to begin peer-to-peer transfer</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
