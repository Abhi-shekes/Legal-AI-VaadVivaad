import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "@radix-ui/themes/styles.css";
import './index.css'
import App from './App.jsx'
import { Theme } from "@radix-ui/themes";
import { BrowserRouter } from 'react-router-dom'


createRoot(document.getElementById('root')).render(
 <BrowserRouter basename="/vaadvivaad">
      <Theme>
      <App />
		</Theme>
    
  </BrowserRouter>
)
