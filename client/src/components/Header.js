import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import ProfileDropdown from "./ProfileDropdown";
import AuthModal from "./AuthModal";

const Header = () => {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const searchRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

  // 안 읽은 메시지 개수 가져오기 (로그인된 사용자만)
  useEffect(() => {
    if (!user) return;

    const fetchUnreadMessages = async () => {
      try {
        const response = await fetch(`${API_URL}/messages/conversations`, {
          credentials: "include",
        });

        if (response.ok) {
          const conversations = await response.json();
          const total = conversations.reduce(
            (sum, conv) => sum + (conv.unreadCount || 0),
            0
          );
          setUnreadMessages(total);
        }
      } catch (error) {
        console.error("안 읽은 메시지 조회 오류:", error);
      }
    };

    fetchUnreadMessages();
  }, [API_URL, user]);

  // Socket.io 이벤트 리스너 설정 (로그인된 사용자만)
  useEffect(() => {
    if (!socket || !user) return;

    // 새 메시지 수신 시 안 읽은 메시지 카운트 증가
    const handleReceiveMessage = (message) => {
      if (message.receiver._id === user._id) {
        setUnreadMessages((prev) => prev + 1);
      }
    };

    // 대화가 읽음 처리되었을 때
    const handleConversationRead = () => {
      // 안 읽은 메시지 개수 다시 가져오기
      fetch(`${API_URL}/messages/conversations`, {
        credentials: "include",
      })
        .then((response) => response.json())
        .then((conversations) => {
          const total = conversations.reduce(
            (sum, conv) => sum + (conv.unreadCount || 0),
            0
          );
          setUnreadMessages(total);
        })
        .catch((error) => console.error("안 읽은 메시지 조회 오류:", error));
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("conversation_read", handleConversationRead);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("conversation_read", handleConversationRead);
    };
  }, [socket, user, API_URL]);

  // 검색어 변경 시 사용자 검색 실행
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim().length >= 2) {
        searchUsers();
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // 검색창 외부 클릭 시 검색 결과 숨기기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // 사용자 검색 함수 - 비로그인 사용자도 사용 가능
  const searchUsers = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      let response, data;

      if (user) {
        // 로그인된 사용자: 기존 엔드포인트 사용
        response = await fetch(`${API_URL}/friends`, {
          credentials: "include",
        });
      } else {
        // 비로그인 사용자: 공개 검색 엔드포인트 사용
        response = await fetch(`${API_URL}/friends/public/search`, {
          credentials: "include",
        });
      }

      if (response.ok) {
        data = await response.json();
        const allUsers = data.users || [];

        // 검색어와 일치하는 사용자 필터링 (이름 또는 이메일에 검색어 포함)
        const filteredUsers = allUsers.filter(
          (person) =>
            (person.username &&
              person.username
                .toLowerCase()
                .includes(searchTerm.toLowerCase())) ||
            (person.email &&
              person.email.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        setSearchResults(filteredUsers);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(true);
      }
    } catch (error) {
      console.error("사용자 검색 오류:", error);
      setSearchResults([]);
      setShowResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  // 사용자 프로필로 이동
  const goToUserFeed = (userId) => {
    if (!user) {
      // 비로그인 사용자인 경우 로그인 모달 표시
      setShowAuthModal(true);
      return;
    }
    navigate(`/feed/${userId}`);
    setSearchTerm("");
    setShowResults(false);
  };

  return (
    <>
      <header className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="container flex items-center justify-between px-4 py-3 mx-auto">
          <h1
            className="text-2xl font-bold text-blue-600 cursor-pointer font-pacifico"
            onClick={() => navigate("/posts")}
          >
            Netless
          </h1>

          {/* 검색창 - 모든 사용자가 사용 가능 */}
          <div className="relative flex-1 max-w-xs mx-4" ref={searchRef}>
            <div className="relative">
              <input
                type="text"
                placeholder="사용자 검색..."
                className="w-full py-2 pl-8 pr-4 text-sm bg-gray-100 border-0 rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowResults(true);
                  }
                }}
              />
              <div className="absolute top-0 left-0 flex items-center justify-center h-full ml-3 text-gray-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              {isSearching && (
                <div className="absolute top-0 right-0 flex items-center justify-center h-full mr-3">
                  <div className="w-4 h-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* 검색 결과 드롭다운 */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute left-0 z-10 w-full mt-1 overflow-hidden bg-white rounded-md shadow-lg max-h-60 overflow-y-auto">
                <ul className="py-1">
                  {searchResults.map((person) => (
                    <li
                      key={person._id}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                      onClick={() => goToUserFeed(person._id)}
                    >
                      <div className="flex items-center">
                        <div className="flex items-center justify-center w-8 h-8 mr-2 overflow-hidden bg-gray-200 rounded-full">
                          {person.profileImage ? (
                            <img
                              src={
                                person.profileImage.startsWith("http")
                                  ? person.profileImage
                                  : `${API_URL}/assets/profiles/${person.profileImage}`
                              }
                              alt={person.username}
                              className="object-cover w-full h-full"
                              onError={(e) => {
                                e.target.style.display = "none";
                                e.target.nextSibling.style.display = "flex";
                              }}
                            />
                          ) : null}
                          <div
                            className="flex items-center justify-center w-full h-full text-sm font-semibold text-gray-500"
                            style={{
                              display: person.profileImage ? "none" : "flex",
                            }}
                          >
                            {person.username.charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">{person.username}</div>
                          {person.email && (
                            <p className="text-xs text-gray-500">
                              {person.email}
                            </p>
                          )}
                          {person.introduction && (
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">
                              {person.introduction}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 검색 결과 없음 */}
            {showResults &&
              searchTerm.length >= 2 &&
              searchResults.length === 0 &&
              !isSearching && (
                <div className="absolute left-0 z-10 w-full px-4 py-2 mt-1 text-sm bg-white rounded-md shadow-lg">
                  {user
                    ? "검색 결과가 없습니다."
                    : "로그인 후 사용자 검색이 가능합니다."}
                </div>
              )}
          </div>

          {/* 로그인된 사용자용 우측 메뉴 */}
          {user ? (
            <div className="flex items-center">
              {/* 메시지 버튼 */}
              <Link
                to="/messages"
                className="relative p-2 mr-3 text-gray-700 transition-colors rounded-full hover:bg-gray-100"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                {unreadMessages > 0 && (
                  <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </Link>

              <div className="hidden mr-4 md:block">
                안녕하세요,{" "}
                <span className="font-semibold">
                  {user?.username || user?.email}
                </span>
                님!
              </div>
              <ProfileDropdown />
            </div>
          ) : (
            /* 비로그인 사용자용 로그인 버튼 */
            <div className="flex items-center">
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-1.5 text-sm text-blue-600 font-medium border border-blue-600 rounded-md hover:bg-blue-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                로그인
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 로그인/회원가입 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
};

export default Header;
