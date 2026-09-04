import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { RouteErrorBoundary, lazyWithReload } from "./lib/lazyChunk";
import "react-toastify/dist/ReactToastify.css";
import Landing from "./Pages/Landing";
import Login from "./Pages/Login";
import Signup from "./Pages/Signup";
import Page404 from "./Pages/Page404";
const Dashboard = lazyWithReload(() => import("./Pages/Dashboard"), "dashboard");

import PublicLayout from "./layouts/PublicLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useSession } from "./hooks/useSession";
const Case = lazyWithReload(() => import("./Pages/Case"), "case");
const Contact = lazyWithReload(() => import("./Pages/Contact"), "contact");
const CaseDetails = lazyWithReload(() => import("./Pages/CaseDetails"), "case-details");
import PublicRoute from "./components/PublicRoute";
const Terms = lazyWithReload(() => import("./Pages/Terms"), "terms");
const Privacy = lazyWithReload(() => import("./Pages/Privacy"), "privacy");

// ... existing imports

function App() {
  // One server-side session check per load; routes wait on it.
  useSession();

  return (
    <>
    <ToastContainer position="top-right" theme="colored" autoClose={3500} newestOnTop />
    <RouteErrorBoundary>
    <Suspense fallback={<div className="min-h-screen" />}>
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />

        <Route
          path="login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        <Route path="contact" element={<Contact />} />
        <Route path="terms" element={<Terms />} />
        <Route path="privacy" element={<Privacy />} />
      </Route>

      {/* Protected Routes */}
      <Route>
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/user/case"
          element={
            <ProtectedRoute>
              <Case />
            </ProtectedRoute>
          }
        />

        {/* Resume. Every create response has returned `resume_url` pointing
            here; there was no such route, so closing the tab mid-hearing left
            the case unreachable. */}
        <Route
          path="/user/case/:id"
          element={
            <ProtectedRoute>
              <Case />
            </ProtectedRoute>
          }
        />

        <Route
          path="/case/:id"
          element={
            <ProtectedRoute>
              <CaseDetails />
            </ProtectedRoute>
          }
        />

      </Route>

      {/* Catch-All Route */}
      <Route path="*" element={<Page404 />} />
    </Routes>
    </Suspense>
    </RouteErrorBoundary>
    </>
  );
}

export default App;
