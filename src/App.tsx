import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import SupplierEntry from './pages/SupplierEntry'
import Dashboard from './pages/Dashboard'
import Listings from './pages/Listings'
import ListingForm, { NewListing } from './pages/ListingForm'
import Analysis from './pages/Analysis'
import Preview from './pages/Preview'
import Visits from './pages/Visits'
import VisitDetail from './pages/VisitDetail'
import Consumer, { ConsumerDetail } from './pages/Consumer'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/supplier" replace />} />
          <Route path="/supplier" element={<SupplierEntry />} />
          <Route path="/supplier/dashboard" element={<Dashboard />} />
          <Route path="/supplier/listings" element={<Listings />} />
          <Route path="/supplier/listings/new" element={<NewListing />} />
          <Route path="/supplier/listings/:id/edit" element={<ListingForm />} />
          <Route path="/supplier/listings/:id/analysis" element={<Analysis />} />
          <Route path="/supplier/listings/:id/preview" element={<Preview />} />
          <Route path="/supplier/visits" element={<Visits />} />
          <Route path="/supplier/visits/:id" element={<VisitDetail />} />
          <Route path="/consumer" element={<Consumer />} />
          <Route path="/consumer/:id" element={<ConsumerDetail />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
