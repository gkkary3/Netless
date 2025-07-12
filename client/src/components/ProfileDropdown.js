import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const ProfileDropdown = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [introduction, setIntroduction] = useState("");
  const [username, setUsername] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState("");
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const { user, logout, updateUser } = useAuth();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

  // 컴포넌트 마운트 시 현재 사용자 정보로 상태 초기화
  React.useEffect(() => {
    if (user) {
      setUsername(user.username || "");
      setIntroduction(user.introduction || "");

      if (user.profileImage) {
        // S3 URL인지 확인
        if (user.profileImage.startsWith("http")) {
          setProfileImagePreview(user.profileImage);
        } else {
          setProfileImagePreview(
            `${API_URL}/assets/profiles/${user.profileImage}`
          );
        }
      }
    }
  }, [user, API_URL]);

  // 드롭다운 토글
  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  // 프로필 수정 모달 열기
  const openProfileModal = () => {
    setShowProfileModal(true);
    setShowDropdown(false);

    // 현재 사용자 정보로 폼 초기화
    if (user) {
      setUsername(user.username || "");
      setIntroduction(user.introduction || "");

      if (user.profileImage) {
        // S3 URL인지 확인
        if (user.profileImage.startsWith("http")) {
          setProfileImagePreview(user.profileImage);
        } else {
          setProfileImagePreview(
            `${API_URL}/assets/profiles/${user.profileImage}`
          );
        }
      } else {
        setProfileImagePreview("");
      }
    }
  };

  // 프로필 수정 모달 닫기
  const closeProfileModal = () => {
    setShowProfileModal(false);
    setProfileImageFile(null);
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
  };

  // 이미지 선택 처리
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // 이미지 파일 유효성 검사
      const validImageTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!validImageTypes.includes(file.type)) {
        toast.error(
          "지원하지 않는 이미지 형식입니다. JPG, PNG, GIF, WEBP 파일을 업로드해주세요."
        );
        return;
      }

      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("이미지 크기는 5MB 이하여야 합니다.");
        return;
      }

      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  // 이미지 클릭 시 파일 업로드 창 열기
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // 프로필 정보 업데이트
  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.warning("사용자 이름을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 먼저 기본 프로필 정보 업데이트
      const response = await fetch(`${API_URL}/profile/${user._id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          username,
          introduction,
        }),
      });

      if (!response.ok) {
        throw new Error("프로필 정보 업데이트에 실패했습니다.");
      }

      const data = await response.json();

      // 이미지 파일이 있는 경우 이미지 업로드 처리
      if (profileImageFile) {
        const formData = new FormData();
        formData.append("profileImage", profileImageFile);

        const imageResponse = await fetch(
          `${API_URL}/profile/${user._id}/image`,
          {
            method: "PUT",
            credentials: "include",
            body: formData,
          }
        );

        if (!imageResponse.ok) {
          throw new Error("프로필 이미지 업로드에 실패했습니다.");
        }

        const imageData = await imageResponse.json();

        // 사용자 정보 업데이트 (AuthContext에서 관리하는 상태)
        updateUser(imageData.user);
      } else {
        // 이미지 변경이 없는 경우
        updateUser(data.user);
      }

      closeProfileModal();
      toast.success("프로필이 성공적으로 업데이트되었습니다.", {
        position: "bottom-right",
        autoClose: 2000,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "프로필 업데이트에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 프로필 이미지 URL 생성
  const getProfileImageUrl = () => {
    if (user?.profileImage) {
      // S3 URL인지 확인
      if (user.profileImage.startsWith("http")) {
        return user.profileImage;
      }
      // 로컬 파일인 경우
      return `${API_URL}/assets/profiles/${user.profileImage}`;
    }
    return null;
  };

  // 프로필 이니셜 표시 (이미지가 없는 경우)
  const getInitials = () => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "?";
  };

  // 내 피드로 이동
  const handleGoToMyFeed = () => {
    setShowDropdown(false);
    navigate("/my-feed");
  };

  return (
    <>
      <div className="relative">
        <button className="flex items-center" onClick={toggleDropdown}>
          <div className="flex items-center justify-center w-10 h-10 overflow-hidden text-white bg-blue-500 rounded-full">
            {user?.profileImage ? (
              <img
                src={getProfileImageUrl()}
                alt="프로필"
                className="object-cover w-full h-full"
              />
            ) : (
              getInitials()
            )}
          </div>
        </button>

        {showDropdown && (
          <div className="absolute right-0 z-10 w-48 mt-2 bg-white border rounded-md shadow-lg">
            <div className="px-4 py-3 border-b">
              <p className="font-medium text-gray-900">{user?.username}</p>
              <p className="text-sm text-gray-500 truncate">{user?.email}</p>
            </div>
            <div className="py-1">
              <button
                onClick={handleGoToMyFeed}
                className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
              >
                내 피드
              </button>
              <button
                onClick={openProfileModal}
                className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
              >
                내 프로필
              </button>
              <button
                onClick={handleLogout}
                className="block w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-gray-100"
              >
                로그아웃
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 프로필 수정 모달 */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">프로필 수정</h3>
              <button
                className="p-1 text-gray-500 rounded-full hover:bg-gray-100"
                onClick={closeProfileModal}
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
            </div>

            <form onSubmit={handleUpdateProfile}>
              {/* 프로필 이미지 업로드 */}
              <div className="flex flex-col items-center mb-4">
                <div
                  className="relative w-24 h-24 mb-2 overflow-hidden bg-gray-200 rounded-full cursor-pointer"
                  onClick={triggerFileInput}
                >
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt="프로필 미리보기"
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-2xl font-semibold text-gray-500">
                      {getInitials()}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black opacity-0 bg-opacity-30 hover:opacity-100">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-8 h-8 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                  ref={fileInputRef}
                />
                <p className="text-sm text-gray-500">프로필 이미지 변경</p>
              </div>

              {/* 사용자 이름 */}
              <div className="mb-4">
                <label
                  htmlFor="username"
                  className="block mb-1 text-sm font-medium text-gray-700"
                >
                  사용자 이름 *
                </label>
                <input
                  type="text"
                  id="username"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>

              {/* 소개글 */}
              <div className="mb-4">
                <label
                  htmlFor="introduction"
                  className="block mb-1 text-sm font-medium text-gray-700"
                >
                  소개글
                </label>
                <textarea
                  id="introduction"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  value={introduction}
                  onChange={(e) => setIntroduction(e.target.value)}
                  placeholder="자신을 소개해주세요."
                ></textarea>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="px-4 py-2 mr-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                  onClick={closeProfileModal}
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "저장 중..." : "저장"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileDropdown;
