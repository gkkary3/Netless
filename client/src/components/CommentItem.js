import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import UserProfileModal from "./UserProfileModal";

const CommentItem = ({ comment, postId, onDeleteComment, onUpdateComment }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState(null);

  const { user } = useAuth();
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";

  // 현재 사용자가 댓글 작성자인지 확인
  const isAuthor = user && comment.author?.id === user._id;

  // 프로필 모달 열기
  const openProfileModal = () => {
    setProfileUser({
      _id: comment.author.id,
      username: comment.author.username,
      profileImage: comment.author.profileImage,
    });
    setShowProfileModal(true);
  };

  // 프로필 모달 닫기
  const closeProfileModal = () => {
    setShowProfileModal(false);
  };

  // 피드 보기 함수
  const handleViewFeed = () => {
    if (profileUser?._id) {
      navigate(`/feed/${profileUser._id}`);
    }
  };

  // 드롭다운 토글
  const toggleDropdown = (e) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  // 수정 모드 활성화
  const handleEditClick = () => {
    setEditText(comment.text);
    setIsEditing(true);
    setShowDropdown(false);
  };

  // 수정 취소
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditText(comment.text);
  };

  // 댓글 수정 처리
  const handleUpdateComment = async (e) => {
    e.preventDefault();

    if (!editText.trim()) {
      toast.warning("댓글 내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${API_URL}/posts/${postId}/comments/${comment._id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            text: editText,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("댓글 수정에 실패했습니다.");
      }

      const data = await response.json();

      // 수정 성공 콜백 호출
      if (onUpdateComment) {
        onUpdateComment(data);
      }

      setIsEditing(false);
      toast.success("댓글이 수정되었습니다.", {
        position: "bottom-right",
        autoClose: 2000,
      });
    } catch (error) {
      console.error("Error updating comment:", error);
      toast.error(error.message || "댓글 수정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 댓글 수정시 엔터키 처리
  const handleEditKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editText.trim() && !isSubmitting) {
        handleUpdateComment(e);
      }
    }
  };

  // 댓글 삭제 처리
  const handleDeleteComment = async () => {
    if (window.confirm("정말 이 댓글을 삭제하시겠습니까?")) {
      try {
        const response = await fetch(
          `${API_URL}/posts/${postId}/comments/${comment._id}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("댓글 삭제에 실패했습니다.");
        }

        const data = await response.json();

        // 삭제 성공 콜백 호출
        if (onDeleteComment) {
          onDeleteComment(data);
        }

        toast.success("댓글이 삭제되었습니다.", {
          position: "bottom-right",
          autoClose: 2000,
        });
      } catch (error) {
        console.error("Error deleting comment:", error);
        toast.error(error.message || "댓글 삭제에 실패했습니다.");
      }
    }
  };

  // 프로필 이미지 URL 생성
  const getProfileImageUrl = () => {
    if (comment.author?.profileImage) {
      // S3 URL인지 확인
      if (comment.author.profileImage.startsWith("http")) {
        return comment.author.profileImage;
      }
      // 로컬 파일인 경우
      return `${API_URL}/assets/profiles/${comment.author.profileImage}`;
    }
    return null;
  };

  // 이니셜 표시 (이미지가 없는 경우)
  const getInitials = () => {
    if (comment.author?.username) {
      return comment.author.username.charAt(0).toUpperCase();
    }
    return "?";
  };

  // 외부 클릭 시 드롭다운 닫기
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (showDropdown) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <>
      <div className="py-3 border-b last:border-b-0">
        <div className="flex items-start">
          <div
            className="flex items-center justify-center w-8 h-8 mr-2 overflow-hidden text-sm font-semibold text-blue-600 bg-blue-100 rounded-full cursor-pointer"
            onClick={openProfileModal}
          >
            {comment.author?.profileImage ? (
              <img
                src={getProfileImageUrl()}
                alt={comment.author?.username || "프로필"}
                className="object-cover w-full h-full"
              />
            ) : (
              getInitials()
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center">
              <span className="font-medium">
                {comment.author?.username || "익명"}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleDateString()}
                {comment.updatedAt > comment.createdAt && " (수정됨)"}
              </span>

              {/* 댓글 작성자인 경우에만 수정/삭제 드롭다운 표시 */}
              {isAuthor && (
                <div className="relative ml-auto">
                  <button
                    className="p-1 text-gray-500 rounded-full hover:bg-gray-100"
                    onClick={toggleDropdown}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                      />
                    </svg>
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 z-10 w-24 mt-1 bg-white border rounded shadow-lg">
                      <button
                        onClick={handleEditClick}
                        className="block w-full px-3 py-1.5 text-sm text-left text-gray-700 hover:bg-gray-100"
                      >
                        수정
                      </button>
                      <button
                        onClick={handleDeleteComment}
                        className="block w-full px-3 py-1.5 text-sm text-left text-red-600 hover:bg-gray-100"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateComment} className="mt-1">
                <textarea
                  className="w-full p-2 mb-2 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="댓글을 수정하세요... (Enter로 저장, Shift+Enter로 줄바꿈)"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleEditKeyDown}
                  rows={2}
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                    disabled={isSubmitting}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "저장 중..." : "저장"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="mt-1 text-sm text-gray-700">{comment.text}</p>
            )}
          </div>
        </div>
      </div>

      {/* 사용자 프로필 모달 */}
      {showProfileModal && (
        <UserProfileModal
          user={profileUser}
          isOpen={showProfileModal}
          onClose={closeProfileModal}
          onViewFeed={handleViewFeed}
        />
      )}
    </>
  );
};

export default CommentItem;
