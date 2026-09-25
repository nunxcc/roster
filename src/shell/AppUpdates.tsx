import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useFeedback } from '../ui/feedback-context'

/**
 * Registers the service worker (production builds only) and says so when Roster can
 * run offline, or when a newer build is waiting. Ignoring the update is fine: it's
 * applied the next time every Roster window is closed.
 */
export function AppUpdates() {
  const { toast } = useFeedback()
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (!offlineReady) return
    setOfflineReady(false)
    toast({ message: 'Roster is ready to work offline' })
  }, [offlineReady, setOfflineReady, toast])

  useEffect(() => {
    if (!needRefresh) return
    setNeedRefresh(false)
    toast({
      message: 'A new version of Roster is ready',
      action: { label: 'Reload', onClick: () => updateServiceWorker(true) },
    })
  }, [needRefresh, setNeedRefresh, toast, updateServiceWorker])

  return null
}
