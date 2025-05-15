import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 로그인하지 않은 사용자만 접근할 수 있는 라우트를 위한 컴포넌트 (로그인/회원가입 페이지)
const PublicRoute = () => {
  const { user, loading } = useAuth();

  // 로딩 중일 때는 로딩 스피너 표시
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600"></div>
      </div>
    );
  }

  // 이미 인증된 사용자는 포스트 페이지로 리디렉션
  if (user) {
    return <Navigate to="/posts" replace />;
  }

  // 인증되지 않은 사용자는 자식 컴포넌트 렌더링
  return <Outlet />;
};

export default PublicRoute;
