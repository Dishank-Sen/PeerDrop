const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function createRoom(userID: string): Promise<{ roomID: string; userID: string }> {
  const response = await fetch(`${API_URL}/room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: userID })
  })

  if (!response.ok) {
    throw new Error('Failed to create room')
  }

  return response.json()
}

export async function joinRoom(roomID: string, userID: string): Promise<{ userID: string }> {
  const response = await fetch(`${API_URL}/room/${roomID}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: userID })
  })

  if (!response.ok) {
    throw new Error('Failed to join room')
  }

  return response.json()
}

export async function leaveRoom(roomID: string, userID: string): Promise<void> {
  const response = await fetch(`${API_URL}/room/${roomID}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userID })
  })

  if (!response.ok) {
    throw new Error('Failed to leave room')
  }
}
