import { useEffect } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import { DemoControls } from './components/DemoControls'
import { GuidedCoach } from './components/GuidedCoach'
import { PhoneStage, UserLayout } from './components/AppShell'
import { LogoMark } from './components/Brand'
import { Button } from './components/ui'
import { ToastProvider } from './components/Toast'
import { useStore } from './store/useStore'
import Login from './pages/user/Login'
import AuctionsList from './pages/user/AuctionsList'
import AuctionDetail from './pages/user/AuctionDetail'
import BidPage from './pages/user/BidPage'
import ReceiptPage from './pages/user/ReceiptPage'
import MyEntries from './pages/user/MyEntries'
import ResultsList from './pages/user/ResultsList'
import ResultDetail from './pages/user/ResultDetail'
import WinnerFlow from './pages/user/WinnerFlow'
import Notifications from './pages/user/Notifications'
import Profile from './pages/user/Profile'
import AdminLogin from './pages/admin/AdminLogin'
import { AdminLayout } from './pages/admin/AdminLayout'
import AdminOverview from './pages/admin/AdminOverview'
import AdminAuctions from './pages/admin/AdminAuctions'
import AdminAuctionForm from './pages/admin/AdminAuctionForm'
import AdminAuctionDetail from './pages/admin/AdminAuctionDetail'
import AdminPayments from './pages/admin/AdminPayments'
import AdminReconciliation from './pages/admin/AdminReconciliation'
import AdminRefunds from './pages/admin/AdminRefunds'
import AdminFulfilment from './pages/admin/AdminFulfilment'
import AdminAudit from './pages/admin/AdminAudit'
import AdminEconomics from './pages/admin/AdminEconomics'
import AdminSettings from './pages/admin/AdminSettings'

export default function App() {
  const sweepExpiredAuctions = useStore((state) => state.sweepExpiredAuctions)

  useEffect(() => {
    sweepExpiredAuctions()
    const timer = window.setInterval(sweepExpiredAuctions, 15_000)
    return () => window.clearInterval(timer)
  }, [sweepExpiredAuctions])

  return (
    <ToastProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <PhoneStage>
              <Login />
            </PhoneStage>
          }
        />

        <Route element={<UserLayout />}>
          <Route index element={<AuctionsList />} />
          <Route path="auction/:id" element={<AuctionDetail />} />
          <Route path="auction/:id/bid" element={<BidPage />} />
          <Route path="auction/:id/receipt/:bidId" element={<ReceiptPage />} />
          <Route path="entries" element={<MyEntries />} />
          <Route path="results" element={<ResultsList />} />
          <Route path="results/:id" element={<ResultDetail />} />
          <Route path="winner/:id" element={<WinnerFlow />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="auctions" element={<AdminAuctions />} />
          <Route path="auctions/new" element={<AdminAuctionForm />} />
          <Route path="auctions/:id" element={<AdminAuctionDetail />} />
          <Route path="auctions/:id/edit" element={<AdminAuctionForm />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="reconciliation" element={<AdminReconciliation />} />
          <Route path="refunds" element={<AdminRefunds />} />
          <Route path="fulfilment" element={<AdminFulfilment />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="economics" element={<AdminEconomics />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>

      <DemoControls />
      <GuidedCoach />
    </ToastProvider>
  )
}

function NotFound() {
  return (
    <PhoneStage>
      <div className="flex h-full flex-col items-center justify-center bg-page px-6 text-center">
        <LogoMark tone="green" className="h-14 w-14" />
        <p className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.22em] text-brand-dark">404 · Not found</p>
        <h1 className="mt-1 text-[30px] font-black tracking-[-0.05em] text-ink">This page isn’t in the demo.</h1>
        <p className="mt-2 max-w-[280px] text-[12px] leading-relaxed text-ink-muted">
          The auction, result or admin page you tried to open does not exist in the current demo state.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link to="/">
            <Button full>Back to auctions</Button>
          </Link>
          <Link to="/admin">
            <Button full variant="secondary">
              Open admin console
            </Button>
          </Link>
        </div>
      </div>
    </PhoneStage>
  )
}
