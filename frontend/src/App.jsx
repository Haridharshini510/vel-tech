import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import RecentJobs from './pages/RecentJobs'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import Companies from './pages/Companies'
import CompanyDetail from './pages/CompanyDetail'
import MaharashtraMap from './pages/MaharashtraMap'
import DistrictProfile from './pages/DistrictProfile'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/maharashtra" element={<MaharashtraMap />} />
            <Route path="/maharashtra/:districtId" element={<DistrictProfile />} />
            <Route path="/recent-jobs" element={<RecentJobs />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/companies/:name" element={<CompanyDetail />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
