import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 인증이 필요한 라우트를 위한 컴포넌트
const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  // 로딩 중일 때는 로딩 스피너 표시 (로딩 텍스트 제거)
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="w-12 h-12 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
      </div>
    );
  }

  // 인증되지 않은 사용자는 posts 페이지로 리디렉션
  if (!user) {
    return <Navigate to="/posts" replace />;
  }

  // 인증된 사용자는 자식 컴포넌트 렌더링
  return <Outlet />;
};

export default ProtectedRoute;
