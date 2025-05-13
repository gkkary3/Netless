import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ProfileDropdown from "./ProfileDropdown";

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

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

  // 사용자 검색 함수
  const searchUsers = async () => {
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(`${API_URL}/friends`, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
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
      }
    } catch (error) {
      console.error("사용자 검색 오류:", error);
    } finally {
      setIsSearching(false);
    }
  };

  // 사용자 프로필로 이동
  const goToUserFeed = (userId) => {
    navigate(`/feed/${userId}`);
    setSearchTerm("");
    setShowResults(false);
  };

  return (
    <header className="sticky top-0 z-20 bg-white shadow-sm">
      <div className="container flex items-center justify-between px-4 py-3 mx-auto">
        <h1
          className="text-2xl font-bold text-blue-600 cursor-pointer font-pacifico"
          onClick={() => navigate("/posts")}
        >
          Netless
        </h1>

        {/* 검색창 */}
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
                            src={`${API_URL}/assets/profiles/${person.profileImage}`}
                            alt={person.username}
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <div className="text-sm font-semibold text-gray-500">
                            {person.username.charAt(0).toUpperCase()}
                          </div>
                        )}
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
                검색 결과가 없습니다.
              </div>
            )}
        </div>

        <div className="flex items-center">
          <div className="hidden mr-4 md:block">
            안녕하세요,{" "}
            <span className="font-semibold">
              {user?.username || user?.email}
            </span>
            님!
          </div>
          <ProfileDropdown />
        </div>
      </div>
    </header>
  );
};

export default Header;
