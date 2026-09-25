import { MotionConfig } from 'motion/react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { NotFound } from './pages/NotFound'
import { WorldPage } from './pages/WorldPage'
import { WorldsPage } from './pages/WorldsPage'
import { Shell } from './shell/Shell'
import { FeedbackProvider } from './ui/FeedbackProvider'

const router = createBrowserRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <WorldsPage /> },
      { path: '/w/:worldId/:tabId?', element: <WorldPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <FeedbackProvider>
        <RouterProvider router={router} />
      </FeedbackProvider>
    </MotionConfig>
  )
}
