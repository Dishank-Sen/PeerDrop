const NODE_ID_KEY = 'nodeID'

export function getNodeID(): string {
  let nodeID = localStorage.getItem(NODE_ID_KEY)

  if (!nodeID) {
    nodeID = crypto.randomUUID()
    localStorage.setItem(NODE_ID_KEY, nodeID)
  }

  return nodeID
}
