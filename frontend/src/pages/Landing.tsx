import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createRoom, joinRoom } from '../lib/api'
import { getNodeID } from '../lib/identity'

export function Landing() {
  const navigate = useNavigate()
  const [roomIDInput, setRoomIDInput] = useState('')
  const [showJoinInput, setShowJoinInput] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreateRoom = async () => {
    setLoading(true)
    setError('')

    try {
      const nodeID = getNodeID()
      const { roomID, userID } = await createRoom(nodeID)
      navigate(`/room/${roomID}?userID=${userID}`)
    } catch (err) {
      setError('Failed to create room')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomIDInput.trim()) {
      setError('Please enter a room ID')
      return
    }

    setLoading(true)
    setError('')

    try {
      const nodeID = getNodeID()
      const { userID } = await joinRoom(roomIDInput.trim(), nodeID)
      navigate(`/room/${roomIDInput.trim()}?userID=${userID}`)
    } catch (err) {
      setError('Failed to join room')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(#0ea5e9 1px, transparent 1px), linear-gradient(90deg, #0ea5e9 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      {/* Glowing orbs */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>

      <div className="relative max-w-md w-full">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-2xl shadow-cyan-500/50 mb-4">
            <svg className="w-11 h-11 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-white mb-2 tracking-tight">
            Peer<span className="text-cyan-400">Drop</span>
          </h1>
          <p className="text-gray-400 text-lg font-mono">Direct P2P File Transfer</p>
        </div>

        {/* Main Card */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="mb-6 bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg animate-shake">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Create Room Button */}
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
            >
              {loading ? (
                <span className="flex items-center justify-center font-mono">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  INITIALIZING...
                </span>
              ) : (
                <span className="flex items-center justify-center font-mono">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  CREATE NEW ROOM
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-gray-800/50 text-gray-500 font-mono uppercase tracking-wider">Or</span>
              </div>
            </div>

            {/* Join Room Section */}
            {!showJoinInput ? (
              <button
                onClick={() => setShowJoinInput(true)}
                disabled={loading}
                className="w-full bg-gray-700/50 hover:bg-gray-700 text-gray-200 font-semibold py-4 px-6 rounded-xl border border-gray-600/50 hover:border-cyan-500/50 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <span className="flex items-center justify-center font-mono">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  JOIN EXISTING ROOM
                </span>
              </button>
            ) : (
              <div className="space-y-3 animate-fadeIn">
                <div className="relative">
                  <input
                    type="text"
                    value={roomIDInput}
                    onChange={(e) => setRoomIDInput(e.target.value)}
                    placeholder="Enter Room ID"
                    className="w-full px-4 py-4 bg-gray-900/50 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all text-gray-200 font-mono placeholder-gray-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                    autoFocus
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleJoinRoom}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 font-mono"
                  >
                    {loading ? 'JOINING...' : 'JOIN'}
                  </button>
                  <button
                    onClick={() => {
                      setShowJoinInput(false)
                      setRoomIDInput('')
                      setError('')
                    }}
                    disabled={loading}
                    className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-gray-200 font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600/50 font-mono"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Features */}
          <div className="mt-8 pt-8 border-t border-gray-700/50">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-500/30 rounded-lg flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-400 font-mono">Lightning Fast</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-400 font-mono">Encrypted P2P</p>
              </div>
              <div className="space-y-2">
                <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/30 rounded-lg flex items-center justify-center mx-auto">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-xs text-gray-400 font-mono">Zero Storage</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-gray-500 text-sm font-mono">
            Direct transfer • No server storage • WebRTC powered
          </p>
        </div>
      </div>
    </div>
  )
}
