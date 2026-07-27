import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { SupplierLayout } from './components/supplier/SupplierLayout'
import Compare from './pages/Compare'
import Conditions from './pages/Conditions'
import HouseDetail from './pages/HouseDetail'
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'
import Results from './pages/Results'
import VisitComplete from './pages/VisitComplete'
import VisitRequest from './pages/VisitRequest'
import SupplierAnalysis from './pages/supplier/Analysis'
import SupplierDashboard from './pages/supplier/Dashboard'
import SupplierEntry from './pages/supplier/Entry'
import ListingWizard from './pages/supplier/ListingWizard'
import SupplierListings from './pages/supplier/Listings'
import SupplierPreview from './pages/supplier/Preview'
import SupplierVisitDetail from './pages/supplier/VisitDetail'
import SupplierVisits from './pages/supplier/Visits'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/conditions" element={<Conditions />} />
          <Route path="/results" element={<Results />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/houses/:id" element={<HouseDetail />} />
          <Route path="/visit/complete" element={<VisitComplete />} />
          <Route path="/visit/:id" element={<VisitRequest />} />
        </Route>
        <Route element={<SupplierLayout />}>
          <Route path="/supplier" element={<SupplierEntry />} />
          <Route path="/supplier/dashboard" element={<SupplierDashboard />} />
          <Route path="/supplier/listings" element={<SupplierListings />} />
          <Route path="/supplier/listings/new" element={<ListingWizard />} />
          <Route path="/supplier/listings/:id/edit" element={<ListingWizard />} />
          <Route path="/supplier/listings/:id/analysis" element={<SupplierAnalysis />} />
          <Route path="/supplier/listings/:id/preview" element={<SupplierPreview />} />
          <Route path="/supplier/visits" element={<SupplierVisits />} />
          <Route path="/supplier/visits/:id" element={<SupplierVisitDetail />} />
        </Route>
        <Route element={<Layout />}>
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
