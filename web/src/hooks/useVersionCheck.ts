import { useState, useEffect } from 'react'
import { getHealth } from '../api/client'

interface VersionInfo {
  currentVersion: string | null
  latestVersion: string | null
  updateAvailable: boolean
  loading: boolean
}

export function useVersionCheck(): VersionInfo {
  const [info, setInfo] = useState<VersionInfo>({
    currentVersion: null,
    latestVersion: null,
    updateAvailable: false,
    loading: true,
  })

  useEffect(() => {
    async function checkVersion() {
      try {
        // Get current version from server
        const health = await getHealth()
        const currentVersion = health.version || null

        // Get latest version from GitHub
        let latestVersion: string | null = null
        try {
          const res = await fetch('https://api.github.com/repos/taylorkpotter/seeBeads/tags')
          if (res.ok) {
            const tags = await res.json()
            if (tags.length > 0) {
              latestVersion = tags[0].name
            }
          }
        } catch {
          // GitHub API failed, skip update check
        }

        const updateAvailable = !!(
          currentVersion &&
          latestVersion &&
          currentVersion !== latestVersion &&
          compareVersions(latestVersion, currentVersion) > 0
        )

        setInfo({
          currentVersion,
          latestVersion,
          updateAvailable,
          loading: false,
        })
      } catch {
        setInfo(prev => ({ ...prev, loading: false }))
      }
    }

    checkVersion()
    // Check every 30 minutes
    const interval = setInterval(checkVersion, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return info
}

// Compare semver versions, returns positive if a > b
function compareVersions(a: string, b: string): number {
  const parseVersion = (v: string) => {
    const match = v.match(/(\d+)\.(\d+)\.(\d+)/)
    if (!match) return [0, 0, 0]
    return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
  }

  const [aMajor, aMinor, aPatch] = parseVersion(a)
  const [bMajor, bMinor, bPatch] = parseVersion(b)

  if (aMajor !== bMajor) return aMajor - bMajor
  if (aMinor !== bMinor) return aMinor - bMinor
  return aPatch - bPatch
}
