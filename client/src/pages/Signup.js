import React, { useState, Suspense, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// 로딩 스피너 컴포넌트
const LoadingSpinner = () => (
  <div className="flex justify-center items-center">
    <div className="w-8 h-8 rounded-full border-4 border-blue-200 animate-spin border-t-blue-600"></div>
  </div>
);

// 회원가입 폼 스켈레톤
const SignupFormSkeleton = () => (
  <div className="p-8 space-y-8 w-full max-w-md bg-white rounded-xl border border-indigo-100 shadow-xl animate-pulse">
    <div className="flex flex-col items-center">
      <div className="w-40 h-12 bg-gray-200 rounded"></div>
      <div className="mt-2 w-32 h-4 bg-gray-100 rounded"></div>
    </div>
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="w-full h-10 bg-gray-200 rounded-t-md"></div>
        <div className="w-full h-10 bg-gray-200"></div>
        <div className="w-full h-10 bg-gray-200 rounded-b-md"></div>
      </div>
      <div className="w-full h-10 bg-blue-200 rounded-md"></div>

      <div className="flex justify-between items-center">
        <div className="w-48 h-4 bg-indigo-100 rounded"></div>
      </div>
    </div>
  </div>
);

const Signup = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const { signup, error } = useAuth();
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(""); // "pending", "success", "fail"
  const [timer, setTimer] = useState(0);
  const [timerId, setTimerId] = useState(null);
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
  // 페이지 로딩 시뮬레이션 (실제로는 필요 없을 수 있음)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validatePassword = (password) => {
    const errors = [];

    // 길이 검증 (8글자 이상 20글자 미만)
    if (
      password.length < 8 ||
      password.length >= 20 ||
      !/[A-Z]/.test(password) ||
      !/[!@#$%^&*(),.?":{}|<>]/.test(password)
    ) {
      errors.push(
        "비밀번호는 8글자 이상 20글자 미만, 대문자와 특수문자를 하나 이상 포함해야 합니다."
      );
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setPasswordError("비밀번호가 일치하지 않습니다.");
      return;
    }

    // 비밀번호 유효성 검증
    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      setPasswordError(passwordErrors.join(" "));
      return;
    }

    setPasswordError("");
    setIsLoading(true);

    const result = await signup(formData);
    setIsLoading(false);

    if (result.success) {
      navigate("/posts");
    }
  };

  const handleSendCode = async () => {
    try {
      setVerificationStatus("pending");
      const res = await fetch(`${API_URL}/auth/send-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setVerificationStatus("code_sent");
        setTimer(300); // 5분(300초)
        // 타이머 시작
        if (timerId) clearInterval(timerId);
        const id = setInterval(() => {
          setTimer((prev) => {
            if (prev <= 1) {
              clearInterval(id);
              setVerificationStatus("");
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimerId(id);
      } else {
        setVerificationStatus("fail");
        alert(data.error || "인증번호 발송 실패");
      }
    } catch (err) {
      setVerificationStatus("fail");
      alert("인증번호 발송 중 오류 발생");
    }
  };

  const handleVerifyCode = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: verificationCode }),
      });
      const data = await res.json();
      if (data.success) {
        setIsEmailVerified(true);
        setVerificationStatus("success");
        if (timerId) clearInterval(timerId);
      } else {
        setVerificationStatus("fail");
        alert(data.error || "인증 실패");
      }
    } catch (err) {
      setVerificationStatus("fail");
      alert("인증 중 오류 발생");
    }
  };

  return (
    <div className="flex justify-center items-center px-4 py-12 min-h-screen bg-gradient-to-br from-indigo-100 via-white to-sky-100 sm:px-6 lg:px-8">
      <Suspense fallback={<SignupFormSkeleton />}>
        {isPageLoading ? (
          <SignupFormSkeleton />
        ) : (
          <div className="p-8 space-y-8 w-full max-w-md bg-white rounded-xl border border-indigo-100 shadow-xl">
            <div>
              <h1 className="mt-2 text-5xl font-extrabold text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 transform font-pacifico hover:scale-105">
                Netless
              </h1>
              <p className="mt-2 text-sm text-center text-gray-600 font-quicksand">
                새로운 연결을 시작하세요
              </p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <div className="-space-y-px rounded-md shadow-sm">
                <div>
                  <label htmlFor="email" className="sr-only">
                    이메일
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        className="px-3 py-2 pr-24 w-full rounded border"
                        placeholder="이메일을 입력하세요"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }));
                        }}
                        disabled={isEmailVerified}
                      />
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={
                          !email ||
                          isEmailVerified ||
                          verificationStatus === "pending"
                        }
                        className="absolute right-2 top-1/2 px-2 py-1 text-sm text-white bg-blue-500 rounded shadow transition-all -translate-y-1/2 hover:bg-blue-600 disabled:bg-gray-300"
                        style={{ minWidth: 80 }}
                      >
                        인증번호 요청
                      </button>
                    </div>
                  </div>
                </div>
                {verificationStatus === "code_sent" && !isEmailVerified && (
                  <div className="flex items-center mt-2 space-x-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        className="px-3 py-2 pr-20 w-full rounded border"
                        placeholder="인증번호 입력"
                      />
                      <span className="absolute right-3 top-1/2 text-xs text-gray-500 -translate-y-1/2 select-none">
                        {Math.floor(timer / 60)}:
                        {(timer % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleVerifyCode}
                      className="px-2 py-1 text-sm text-white bg-green-500 rounded shadow transition-all hover:bg-green-600"
                      style={{ minWidth: 60 }}
                    >
                      인증 확인
                    </button>
                  </div>
                )}
                {isEmailVerified && (
                  <div className="mt-2 text-sm text-green-600">
                    이메일 인증 완료!
                  </div>
                )}
                <div>
                  <label htmlFor="password" className="sr-only">
                    비밀번호
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="block relative px-3 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-none border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="비밀번호"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="sr-only">
                    비밀번호 확인
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="block relative px-3 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-none border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="비밀번호 확인"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="username" className="sr-only">
                    사용자 이름
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="block relative px-3 py-2 w-full placeholder-gray-500 text-gray-900 bg-white rounded-none rounded-b-md border border-gray-300 appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="사용자 이름"
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {error && (
                <div className="text-sm text-center text-red-500">{error}</div>
              )}

              {passwordError && (
                <div className="text-sm text-center text-red-500">
                  {passwordError}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={!isEmailVerified /* && 기타 필수 조건들 */}
                  className="flex relative justify-center px-4 py-2 w-full text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-md border border-transparent shadow-md transition-all duration-200 group hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <LoadingSpinner />
                      <span className="ml-2">가입 중...</span>
                    </span>
                  ) : (
                    "회원가입"
                  )}
                </button>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <Link
                    to="/login"
                    className="font-medium text-indigo-600 transition-colors duration-200 hover:text-indigo-700"
                  >
                    이미 계정이 있으신가요? 로그인
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

export default Signup;
