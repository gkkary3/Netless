import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const UserProfileModal = ({ user, isOpen, onClose, onViewFeed }) => {
  const [friendStatus, setFriendStatus] = useState("none"); // none, requested, friend
  const [loading, setLoading] = useState(false);
  const { user: currentUser } = useAuth();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

  // 친구 상태 확인
  useEffect(() => {
    if (isOpen && user && currentUser) {
      checkFriendStatus();
    }
  }, [isOpen, user, currentUser]);

  // 친구 상태 확인 함수
  const checkFriendStatus = async () => {
    if (user._id === currentUser._id) return; // 자기 자신인 경우 건너뜀

    try {
      // 현재 사용자의 친구 정보 가져오기
      const response = await fetch(`${API_URL}/friends/user-friends`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("친구 정보를 가져오는데 실패했습니다.");
      }

      const data = await response.json();

      // 이미 친구인지 확인
      if (data.friends && data.friends.includes(user._id)) {
        setFriendStatus("friend");
        return;
      }

      // 대상 사용자의 정보 가져오기
      const targetUserResponse = await fetch(`${API_URL}/profile/${user._id}`, {
        credentials: "include",
      });

      if (!targetUserResponse.ok) {
        throw new Error("사용자 정보를 가져오는데 실패했습니다.");
      }

      const targetUserData = await targetUserResponse.json();

      // 대상 사용자의 friendsRequests에 내 ID가 있는지 확인 (내가 친구 요청을 보냈는지)
      if (
        targetUserData.user.friendsRequests &&
        targetUserData.user.friendsRequests.includes(currentUser._id)
      ) {
        setFriendStatus("requested");
        return;
      }

      // 현재 사용자의 friendsRequests에 대상 사용자의 ID가 있는지 확인 (상대방이 친구 요청을 보냈는지)
      if (data.friendRequests && data.friendRequests.includes(user._id)) {
        setFriendStatus("received");
        return;
      }

      // 아무 관계 없음
      setFriendStatus("none");
    } catch (error) {
      console.error("친구 상태 확인 오류:", error);
      toast.error("친구 상태를 확인하는데 실패했습니다.");
    }
  };

  // 친구 요청 보내기
  const handleSendFriendRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/friends/${user._id}/add-friend`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("친구 요청 보내기에 실패했습니다.");
      }

      const data = await response.json();
      setFriendStatus("requested");
      toast.success(data.message || "친구 요청을 보냈습니다.");
    } catch (error) {
      console.error("친구 요청 오류:", error);
      toast.error(error.message || "친구 요청에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 친구 요청 취소
  const handleCancelFriendRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/friends/${user._id}/remove-friend-request/${currentUser._id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("친구 요청 취소에 실패했습니다.");
      }

      const data = await response.json();
      setFriendStatus("none");
      toast.success(data.message || "친구 요청을 취소했습니다.");
    } catch (error) {
      console.error("친구 요청 취소 오류:", error);
      toast.error(error.message || "친구 요청 취소에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 친구 요청 수락
  const handleAcceptFriendRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/friends/${user._id}/accept-friend-request`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("친구 요청 수락에 실패했습니다.");
      }

      const data = await response.json();
      setFriendStatus("friend");
      toast.success(data.message || "친구 요청을 수락했습니다.");
    } catch (error) {
      console.error("친구 요청 수락 오류:", error);
      toast.error(error.message || "친구 요청 수락에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 친구 삭제
  const handleRemoveFriend = async () => {
    if (!window.confirm("정말 이 친구를 삭제하시겠습니까?")) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/friends/${user._id}/remove-friend`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("친구 삭제에 실패했습니다.");
      }

      const data = await response.json();
      setFriendStatus("none");
      toast.success(data.message || "친구를 삭제했습니다.");
    } catch (error) {
      console.error("친구 삭제 오류:", error);
      toast.error(error.message || "친구 삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 프로필 이미지 URL 생성
  const getProfileImageUrl = () => {
    if (user?.profileImage) {
      return `${API_URL}/assets/profiles/${user.profileImage}`;
    }
    return null;
  };

  // 이니셜 표시 (이미지가 없는 경우)
  const getInitials = () => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "?";
  };

  // 피드 보기 클릭 핸들러
  const handleViewFeed = () => {
    onClose();
    if (onViewFeed) {
      onViewFeed();
    }
  };

  if (!isOpen || !user) return null;

  // 모달 외부 클릭 시 닫기 기능
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute z-10 p-2 text-gray-600 bg-white rounded-full right-4 top-4 hover:bg-gray-100"
          onClick={onClose}
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="p-6 pt-10">
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-24 h-24 mb-4 overflow-hidden bg-gray-200 rounded-full">
              {user.profileImage ? (
                <img
                  src={getProfileImageUrl()}
                  alt={user.username}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-2xl font-semibold text-gray-600">
                  {getInitials()}
                </div>
              )}
            </div>
            <h2 className="mb-1 text-xl font-bold">{user.username}</h2>
            {user.introduction && (
              <p className="max-w-xs mx-auto mb-4 text-sm text-center text-gray-600">
                {user.introduction}
              </p>
            )}

            {/* 액션 버튼 그룹 */}
            <div className="flex items-center justify-center mt-4 space-x-4">
              {/* 피드 보기 버튼 */}
              <button
                onClick={handleViewFeed}
                className="flex flex-col items-center p-2 transition duration-200 rounded-full hover:bg-gray-100"
                title="피드 보기"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v10m2 2v-6m2 6h-6"
                  />
                </svg>
                <span className="mt-1 text-xs">피드</span>
              </button>

              {/* 친구 관련 버튼 (자기 자신이 아닌 경우에만) */}
              {user._id !== currentUser._id && (
                <>
                  {friendStatus === "none" && (
                    <button
                      onClick={handleSendFriendRequest}
                      className="flex flex-col items-center p-2 transition duration-200 rounded-full hover:bg-gray-100"
                      title="친구 요청 보내기"
                      disabled={loading}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        />
                      </svg>
                      <span className="mt-1 text-xs">친구 추가</span>
                    </button>
                  )}

                  {friendStatus === "requested" && (
                    <button
                      onClick={handleCancelFriendRequest}
                      className="flex flex-col items-center p-2 transition duration-200 rounded-full hover:bg-gray-100"
                      title="친구 요청 취소"
                      disabled={loading}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-gray-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                      <span className="mt-1 text-xs">요청 취소</span>
                    </button>
                  )}

                  {friendStatus === "received" && (
                    <>
                      <button
                        onClick={handleAcceptFriendRequest}
                        className="flex flex-col items-center p-2 transition duration-200 rounded-full hover:bg-gray-100"
                        title="친구 요청 수락"
                        disabled={loading}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-6 h-6 text-green-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="mt-1 text-xs">수락</span>
                      </button>

                      <button
                        onClick={handleCancelFriendRequest}
                        className="flex flex-col items-center p-2 transition duration-200 rounded-full hover:bg-gray-100"
                        title="친구 요청 거절"
                        disabled={loading}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-6 h-6 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        <span className="mt-1 text-xs">거절</span>
                      </button>
                    </>
                  )}

                  {friendStatus === "friend" && (
                    <>
                      <div className="flex flex-col items-center p-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-6 h-6 text-blue-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                        <span className="mt-1 text-xs">친구</span>
                      </div>

                      <button
                        onClick={handleRemoveFriend}
                        className="flex flex-col items-center p-2 transition duration-200 rounded-full hover:bg-gray-100"
                        title="친구 삭제"
                        disabled={loading}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-6 h-6 text-red-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
                          />
                        </svg>
                        <span className="mt-1 text-xs">친구 삭제</span>
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* 로딩 표시 */}
            {loading && (
              <div className="mt-4 text-center">
                <div className="inline-block w-5 h-5 border-2 border-t-blue-500 border-gray-200 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // createPortal을 사용하여 모달을 DOM의 최상위에 렌더링
  return createPortal(modalContent, document.body);
};

export default UserProfileModal;
