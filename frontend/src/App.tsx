import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Dashboard from './pages/Dashboard/Dashboard'
import WorkoutHistory from './pages/WorkoutHistory/WorkoutHistory'
import Programs from './pages/Programs/Programs'
import CreateProgram from './pages/CreateProgram/CreateProgram'

const App = () => {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/history" element={<WorkoutHistory />} />
          <Route path="/programs" element={<Programs />} />
          <Route path="/programs/create" element={<CreateProgram />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
