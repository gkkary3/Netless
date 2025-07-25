import React, { useState, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 로딩 스피너 컴포넌트
const LoadingSpinner = () => (
  <div className="flex justify-center items-center">
    <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
  </div>
);

// 로그인 폼 스켈레톤
const LoginFormSkeleton = () => (
  <div className="p-8 space-y-8 w-full max-w-md bg-white rounded-xl border border-indigo-100 shadow-xl animate-pulse">
    <div className="flex flex-col items-center">
      <div className="w-40 h-12 bg-gray-200 rounded"></div>
      <div className="mt-2 w-32 h-4 bg-gray-100 rounded"></div>
    </div>
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="w-full h-10 bg-gray-200 rounded-md"></div>
        <div className="w-full h-10 bg-gray-200 rounded-md"></div>
      </div>
      <div className="w-full h-10 bg-blue-200 rounded-md"></div>

      <div className="mt-6">
        <div className="flex relative justify-center mb-6">
          <div className="w-full border-t border-gray-300"></div>
          <div className="absolute px-2 bg-white">
            <div className="w-40 h-4 bg-gray-100 rounded"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="w-full h-10 bg-gray-100 rounded-md"></div>
          <div className="w-full h-10 bg-yellow-100 rounded-md"></div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="w-20 h-4 bg-indigo-100 rounded"></div>
      </div>
    </div>
  </div>
);

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
const CLIENT_URL = process.env.REACT_APP_CLIENT_URL || "http://localhost:3000";

// 환경변수 디버깅
console.log("=== 환경변수 확인 ===");
console.log("REACT_APP_API_URL:", process.env.REACT_APP_API_URL);
console.log("REACT_APP_CLIENT_URL:", process.env.REACT_APP_CLIENT_URL);
console.log("API_URL:", API_URL);
console.log("CLIENT_URL:", CLIENT_URL);
console.log("현재 location:", window.location.href);
console.log("===================");

// 전역 에러 리스너 추가
window.addEventListener("error", (e) => {
  console.error("🚨 JavaScript 에러 발생:", e.error);
  console.error("파일:", e.filename);
  console.error("라인:", e.lineno);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("🚨 Promise 에러 발생:", e.reason);
});

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const { login, error } = useAuth();
  const navigate = useNavigate();

  // 페이지 로딩 시뮬레이션 (실제로는 필요 없을 수 있음)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    console.log("handleSubmit 함수 진입!");
    console.log("이벤트:", e);
    console.log("email:", email);
    console.log("password:", password);

    e.preventDefault();
    setIsLoading(true);

    console.log("로그인 시도 중...");
    const result = await login(email, password);
    console.log("로그인 결과:", result);

    setIsLoading(false);

    if (result.success) {
      // .env의 REACT_APP_CLIENT_URL을 사용하여 리다이렉트
      console.log("CLIENT_URL:", CLIENT_URL);
      console.log("리다이렉트 시도:", `${CLIENT_URL}/posts`);

      // 디버깅을 위해 3초 후 리다이렉트
      console.log("3초 후 리다이렉트 실행...");
      setTimeout(() => {
        console.log("리다이렉트 실행!");
        window.location.href = `${CLIENT_URL}/posts`;
      }, 3000);
    }
  };

  // 소셜 로그인 처리 함수
  const handleSocialLogin = (provider) => {
    console.log("🟢 소셜 로그인 버튼 클릭됨:", provider);
    console.log("소셜 로그인 URL:", `${API_URL}/auth/${provider}`);

    // 전체 URL로 서버 엔드포인트 직접 호출
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  return (
    <div className="flex justify-center items-center px-4 py-12 min-h-screen bg-gradient-to-br from-sky-100 via-white to-indigo-100 sm:px-6 lg:px-8">
      <Suspense fallback={<LoginFormSkeleton />}>
        {isPageLoading ? (
          <LoginFormSkeleton />
        ) : (
          <div className="p-8 space-y-8 w-full max-w-md bg-white rounded-xl border border-indigo-100 shadow-xl">
            <div>
              <h1 className="mt-2 text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 transform font-pacifico hover:scale-105">
                Netless
              </h1>
              <p className="mt-2 text-sm text-center text-gray-600 font-quicksand">
                경계 없는 소통의 시작
              </p>
            </div>
            <form
              className="mt-8 space-y-6"
              onSubmit={(e) => {
                console.log("🟡 폼 onSubmit 이벤트 발생!");
                handleSubmit(e);
              }}
            >
              <div className="-space-y-px rounded-md shadow-sm">
                <div>
                  <label htmlFor="email" className="sr-only">
                    이메일
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="block relative px-3 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-none rounded-t-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="이메일"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">
                    비밀번호
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="block relative px-3 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-none rounded-b-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="비밀번호"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-center text-red-500">{error}</div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  onClick={(e) => {
                    console.log("🔴 로그인 버튼 클릭됨!");
                    console.log("버튼 타입:", e.target.type);
                    console.log("폼 요소:", e.target.form);
                  }}
                  className="flex relative justify-center px-4 py-2 w-full text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md border border-transparent shadow-md transition-all duration-200 group hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <LoadingSpinner />
                      <span className="ml-2">로그인 중...</span>
                    </span>
                  ) : (
                    "로그인"
                  )}
                </button>
              </div>

              {/* 소셜 로그인 버튼 */}
              <div className="mt-6">
                <div className="relative">
                  <div className="flex absolute inset-0 items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="flex relative justify-center text-sm">
                    <span className="px-2 text-gray-500 bg-white">
                      소셜 계정으로 로그인
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div>
                    <button
                      type="button"
                      onClick={() => handleSocialLogin("google")}
                      className="inline-flex justify-center px-4 py-2 w-full text-sm font-medium text-gray-600 bg-white rounded-md border border-gray-300 shadow-sm transition-colors duration-200 hover:bg-gray-50"
                    >
                      <svg
                        className="mr-2 w-5 h-5"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
                      </svg>
                      Google
                    </button>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => handleSocialLogin("kakao")}
                      className="inline-flex justify-center px-4 py-2 w-full text-sm font-medium text-gray-800 bg-yellow-300 rounded-md border border-gray-300 shadow-sm transition-colors duration-200 hover:bg-yellow-400"
                    >
                      <svg
                        className="mr-2 w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M12 3C7.0375 3 3 6.15643 3 10.0455C3 12.5652 4.67125 14.7389 7.1025 15.9031C6.93 16.5061 6.3525 18.5516 6.27 18.8531C6.27 18.8531 6.25125 19.0414 6.3675 19.1121C6.48375 19.1828 6.6525 19.1121 6.6525 19.1121C7.0725 19.0414 9.4575 17.3711 10.0312 16.952C10.6575 17.0473 11.31 17.0914 12 17.0914C16.9625 17.0914 21 13.9345 21 10.0455C21 6.15643 16.9625 3 12 3Z" />
                      </svg>
                      카카오
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <Link
                    to="/signup"
                    className="font-medium text-indigo-600 transition-colors duration-200 hover:text-indigo-700"
                  >
                    회원가입
                  </Link>
                </div>
              </div>
            </form>
          </div>
        )}
      </Suspense>
    </div>
  );
};

export default Login;
