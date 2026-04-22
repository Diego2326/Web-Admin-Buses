import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './app/AppProviders'
import { AppRouter } from './app/AppRouter'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </BrowserRouter>
  )
}

export default App
