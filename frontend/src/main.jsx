import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { isContactPreview } from './utils/session.js'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

const root = createRoot(document.getElementById('root'))

if (import.meta.env.DEV && isContactPreview()) {
  import('./dev/ContactPreview.jsx').then(({ default: ContactPreview }) => {
    root.render(<ContactPreview />)
  }).catch(error => {
    console.error('Unable to start contact preview', error)
    root.render(<p role="alert">Unable to load the local contact preview. Check the development console.</p>)
  })
} else root.render(
    <RouterProvider router={createBrowserRouter([{path:"*",element:<><App/><Toaster position="top-right"/></>}])}/>
)
