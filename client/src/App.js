import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Posts from "./pages/Posts";
import MyFeed from "./pages/MyFeed";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// 글로벌 Fallback 로딩 컴포넌트
const GlobalLoadingSpinner = () => (
  <div className="flex justify-center items-center h-screen bg-gray-100">
    <div className="w-12 h-12 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Suspense fallback={<GlobalLoadingSpinner />}>
            <Routes>
              {/* 공개 라우트 - posts 페이지는 누구나 접근 가능 */}
              <Route path="/posts" element={<Posts />} />

              {/* 보호된 라우트 - 인증된 사용자만 접근 가능 */}
              <Route element={<ProtectedRoute />}>
                <Route path="/my-feed" element={<MyFeed />} />
                <Route path="/feed/:userId" element={<MyFeed />} />
                <Route
                  path="/messages"
                  element={
                    <React.Suspense fallback={<GlobalLoadingSpinner />}>
                      <Messages />
                    </React.Suspense>
                  }
                />
                <Route
                  path="/messages/:userId"
                  element={
                    <React.Suspense fallback={<GlobalLoadingSpinner />}>
                      <MessageDetail />
                    </React.Suspense>
                  }
                />
              </Route>

              {/* 공개 라우트 - 인증되지 않은 사용자만 접근 가능 */}
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
              </Route>

              {/* 기본 리디렉션 - 메인 페이지로 posts 페이지를 설정 */}
              <Route path="/" element={<Navigate to="/posts" />} />
            </Routes>
          </Suspense>

          {/* 토스트 알림 컨테이너 */}
          <ToastContainer
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

// Messages 컴포넌트와 MessageDetail 컴포넌트는 아직 생성되지 않았으므로 플레이스홀더로 작성
const Messages = React.lazy(() => import("./pages/Messages"));
const MessageDetail = React.lazy(() => import("./pages/MessageDetail"));

export default App;
