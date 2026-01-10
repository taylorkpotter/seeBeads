import { Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import Dashboard from './views/Dashboard'
import Issues from './views/Issues'
import Epics from './views/Epics'
import Timeline from './views/Timeline'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/issues/:id" element={<Issues />} />
          <Route path="/epics" element={<Epics />} />
          <Route path="/timeline" element={<Timeline />} />
        </Routes>
      </Layout>
    </QueryClientProvider>
  )
}

export default App
