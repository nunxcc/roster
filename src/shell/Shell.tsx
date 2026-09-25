import { motion } from 'motion/react'
import { useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router'
import { AppUpdates } from './AppUpdates'
import { TopBar } from './TopBar'

/**
 * Layout route: top bar + a fade-in whenever you move between the worlds list
 * and a world. Enter-only on purpose: exit animations would have to wait for
 * the old page, and that page keeps re-rendering from live database queries.
 */
export function Shell() {
  const location = useLocation()
  const outlet = useOutlet()
  // Only animate between pages, not between tabs of the same world
  const key = location.pathname.split('/').slice(0, 3).join('/') || '/'

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [key])

  return (
    <>
      <AppUpdates />
      <TopBar />
      <motion.main
        key={key}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {outlet}
      </motion.main>
    </>
  )
}
