import { Stats, BeadsResponse, BeadDetailResponse, Filter, EpicProgress } from '../types'

const API_BASE = '/api'

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  
  return response.json()
}

export async function getStats(): Promise<Stats> {
  return fetchJSON<Stats>(`${API_BASE}/stats`)
}

export async function getBeads(filter?: Filter): Promise<BeadsResponse> {
  const params = new URLSearchParams()
  
  if (filter?.status?.length) {
    params.set('status', filter.status.join(','))
  }
  if (filter?.type?.length) {
    params.set('type', filter.type.join(','))
  }
  if (filter?.priority?.length) {
    params.set('priority', filter.priority.join(','))
  }
  if (filter?.labels?.length) {
    params.set('labels', filter.labels.join(','))
  }
  if (filter?.search) {
    params.set('search', filter.search)
  }
  if (filter?.ready) {
    params.set('ready', 'true')
  }
  if (filter?.limit) {
    params.set('limit', String(filter.limit))
  }
  if (filter?.offset) {
    params.set('offset', String(filter.offset))
  }
  
  const query = params.toString()
  const url = query ? `${API_BASE}/beads?${query}` : `${API_BASE}/beads`
  return fetchJSON<BeadsResponse>(url)
}

export async function getBead(id: string): Promise<BeadDetailResponse> {
  return fetchJSON<BeadDetailResponse>(`${API_BASE}/beads/${encodeURIComponent(id)}`)
}

export async function getEpics(): Promise<{ epics: EpicProgress[] }> {
  return fetchJSON<{ epics: EpicProgress[] }>(`${API_BASE}/epics`)
}

export async function setAgentMode(enabled: boolean): Promise<{ agentMode: boolean }> {
  return fetchJSON<{ agentMode: boolean }>(`${API_BASE}/agent-mode`, {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  })
}

export async function getHealth(): Promise<{
  status: string
  beadsFile: string
  lastUpdated: string
  totalBeads: number
}> {
  return fetchJSON(`${API_BASE}/health`)
}
