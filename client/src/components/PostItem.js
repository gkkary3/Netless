import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import CommentItem from "./CommentItem";
import UserProfileModal from "./UserProfileModal";

const PostItem = ({
  post,
  onDeletePost,
  onUpdatePost,
  isCompact = false,
  onRequireAuth,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editImages, setEditImages] = useState([]);
  const [originalImages, setOriginalImages] = useState([]);
  const [imagesToRemove, setImagesToRemove] = useState([]);
  const [likeLoading, setLikeLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  // 슬라이더 관련 추가 상태 및 refs
  const sliderScrollRef = useRef(null);
  const isManualScrollingRef = useRef(false);
  const touchStartXRef = useRef(0);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
  const { user } = useAuth();
  const navigate = useNavigate();

  // 현재 사용자가 게시물의 작성자인지 확인
  const isAuthor = user && post.author?._id === user._id;

  // 현재 사용자가 좋아요를 눌렀는지 확인
  const isLikedByCurrentUser = post.likes?.includes(user?._id);

  // 작성자의 피드로 이동
  const goToAuthorFeed = () => {
    if (!user) {
      onRequireAuth && onRequireAuth();
      return;
    }
    if (showProfileModal) {
      setShowProfileModal(false);
    }
    navigate(`/feed/${post.author._id}`);
  };

  // 드롭다운 토글
  const toggleDropdown = (e) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };

  // 수정 모달 열기
  const openEditModal = (e) => {
    e.preventDefault();
    setEditDescription(post.description); // 현재 게시물 내용으로 초기화
    setOriginalImages(post.images || []); // 현재 게시물의 이미지 배열 저장
    setEditImages([]); // 새로 추가될 이미지 초기화
    setImagesToRemove([]); // 삭제할 이미지 초기화
    setShowEditModal(true);
    setShowDropdown(false); // 드롭다운 닫기
  };

  // 수정 모달 닫기
  const closeEditModal = () => {
    setShowEditModal(false);
  };

  // 게시물 업데이트 처리
  const handleUpdatePost = async (e) => {
    e.preventDefault();
    if (!editDescription.trim()) {
      toast.error("내용을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("description", editDescription);

      // 삭제할 이미지 정보 추가
      if (imagesToRemove.length > 0) {
        imagesToRemove.forEach((img) => {
          formData.append("imagesToRemove", img);
        });
      }

      // 새로 추가할 이미지 파일 추가
      if (editImages.length > 0) {
        editImages.forEach((image) => {
          formData.append("images", image);
        });
      }

      const response = await fetch(`${API_URL}/posts/${post._id}`, {
        method: "PUT",
        credentials: "include",
        body: formData, // JSON 대신 FormData 사용
        headers: {
          // FormData를 사용할 때는 Content-Type 헤더를 설정하지 않음
          // 브라우저가 자동으로 설정함
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("게시물 수정에 실패했습니다.");
      }

      const updatedPost = await response.json();

      // 수정 성공 후 콜백 호출하여 부모 컴포넌트에 알림
      if (onUpdatePost) {
        onUpdatePost(updatedPost.post || updatedPost);
      }

      setShowEditModal(false);
      toast.success("게시물이 수정되었습니다.", {
        icon: "✅",
      });
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error(error.message || "게시물 수정에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 게시물 삭제 처리
  const handleDeletePost = async (e) => {
    e.preventDefault();
    if (window.confirm("정말 이 게시물을 삭제하시겠습니까?")) {
      try {
        const response = await fetch(`${API_URL}/posts/${post._id}`, {
          method: "DELETE",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("게시물 삭제에 실패했습니다.");
        }

        // 삭제 성공 후 콜백 호출
        if (onDeletePost) {
          onDeletePost(post._id);
        }

        toast.success("게시물이 삭제되었습니다.", {
          icon: "🗑️",
        });
      } catch (error) {
        console.error("Error deleting post:", error);
        toast.error(error.message || "게시물 삭제에 실패했습니다.");
      }
    }
  };

  // 중앙 통제 함수 - 슬라이드 이동
  const goToSlide = (index) => {
    if (!sliderScrollRef.current || !post.images || post.images.length <= 1)
      return;

    // 유효한 인덱스로 제한
    const safeIndex = Math.max(0, Math.min(index, post.images.length - 1));
    setCurrentImageIndex(safeIndex);

    // 스크롤이 사용자에 의한 것임을 표시
    isManualScrollingRef.current = true;

    // 슬라이더 이동
    const slideWidth = sliderScrollRef.current.offsetWidth;
    sliderScrollRef.current.scrollTo({
      left: safeIndex * slideWidth,
      behavior: "smooth",
    });

    // 500ms 후에 수동 스크롤 플래그 해제
    setTimeout(() => {
      isManualScrollingRef.current = false;
    }, 500);
  };

  // 이미지 갤러리 컨트롤
  const nextImage = (e) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    if (post.images && post.images.length > 1) {
      const nextIndex = (currentImageIndex + 1) % post.images.length;
      goToSlide(nextIndex);
    }
  };

  const prevImage = (e) => {
    e.stopPropagation(); // 이벤트 버블링 방지
    if (post.images && post.images.length > 1) {
      const prevIndex =
        (currentImageIndex - 1 + post.images.length) % post.images.length;
      goToSlide(prevIndex);
    }
  };

  // 모달 열기
  const openImageModal = () => {
    setShowModal(true);
  };

  // 모달 닫기
  const closeImageModal = () => {
    setShowModal(false);
  };

  // 현재 이미지의 URL
  const getCurrentImageUrl = () => {
    if (post.images && post.images.length > 0) {
      const imageUrl = post.images[currentImageIndex];
      // S3 URL인지 확인
      if (imageUrl.startsWith("http")) {
        return imageUrl;
      }
      // 로컬 파일인 경우
      return `${API_URL}/assets/images/${imageUrl}`;
    } else if (post.image) {
      // S3 URL인지 확인
      if (post.image.startsWith("http")) {
        return post.image;
      }
      // 로컬 파일인 경우
      return `${API_URL}/assets/images/${post.image}`;
    }
    return "";
  };

  // 외부 클릭 시 드롭다운 닫기
  const handleClickOutside = () => {
    if (showDropdown) {
      setShowDropdown(false);
    }
  };

  // 스크롤 이벤트 감지 설정
  useEffect(() => {
    const slider = sliderScrollRef.current;
    if (!slider || !post.images || post.images.length <= 1) return;

    let scrollTimeout;

    // 스크롤 이벤트 핸들러
    const handleScroll = () => {
      // 수동 스크롤 중이면 무시
      if (isManualScrollingRef.current) return;

      // 이전 타이머 취소
      clearTimeout(scrollTimeout);

      // 스크롤이 멈춘 후 처리
      scrollTimeout = setTimeout(() => {
        const slideWidth = slider.offsetWidth;
        if (slideWidth <= 0) return;

        const scrollPosition = slider.scrollLeft;
        const newSlideIndex = Math.round(scrollPosition / slideWidth);

        // 유효 범위 내에서만 상태 업데이트
        if (
          newSlideIndex >= 0 &&
          newSlideIndex < post.images.length &&
          newSlideIndex !== currentImageIndex
        ) {
          setCurrentImageIndex(newSlideIndex);
        }
      }, 150);
    };

    // 터치 이벤트 핸들러 - 모바일용
    const handleTouchStart = (e) => {
      touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e) => {
      // 터치 종료 시 현재 슬라이드 인덱스 확인
      const slideWidth = slider.offsetWidth;
      if (slideWidth <= 0) return;

      const scrollPosition = slider.scrollLeft;
      const newSlideIndex = Math.round(scrollPosition / slideWidth);

      if (
        newSlideIndex >= 0 &&
        newSlideIndex < post.images.length &&
        newSlideIndex !== currentImageIndex
      ) {
        setCurrentImageIndex(newSlideIndex);
      }
    };

    slider.addEventListener("scroll", handleScroll);
    slider.addEventListener("touchstart", handleTouchStart);
    slider.addEventListener("touchend", handleTouchEnd);

    return () => {
      slider.removeEventListener("scroll", handleScroll);
      slider.removeEventListener("touchstart", handleTouchStart);
      slider.removeEventListener("touchend", handleTouchEnd);
      clearTimeout(scrollTimeout);
    };
  }, [post.images, currentImageIndex]);

  useEffect(() => {
    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showDropdown]);

  // 이미지 선택 처리
  const handleEditImageChange = (e) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      // 기존 이미지 + 남아있는 원본 이미지 + 새 이미지의 총 개수가 5개를 초과하는지 확인
      const totalImagesCount =
        editImages.length +
        (originalImages.length - imagesToRemove.length) +
        newImages.length;

      if (totalImagesCount > 5) {
        toast.error("최대 5개의 이미지만 업로드할 수 있습니다.");
        return;
      }
      setEditImages((prev) => [...prev, ...newImages]);
    }
  };

  // 새로 추가한 이미지 삭제 처리
  const handleRemoveNewImage = (index) => {
    setEditImages(editImages.filter((_, i) => i !== index));
  };

  // 기존 이미지 삭제 처리
  const handleRemoveOriginalImage = (filename) => {
    setImagesToRemove([...imagesToRemove, filename]);
  };

  // 삭제 표시된 이미지 복원
  const handleRestoreImage = (filename) => {
    setImagesToRemove(imagesToRemove.filter((name) => name !== filename));
  };

  // 좋아요 처리 함수
  const handleLike = async () => {
    if (!user) {
      onRequireAuth && onRequireAuth();
      return;
    }

    if (likeLoading) return;

    setLikeLoading(true);
    try {
      const response = await fetch(`${API_URL}/posts/${post._id}/like`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("좋아요 처리에 실패했습니다.");
      }

      const data = await response.json();

      // 게시물 상태 업데이트
      if (onUpdatePost && data.post) {
        onUpdatePost(data.post);
      }

      // 좋아요 상태 변경 메시지
      toast.success(data.message, {
        icon: "❤️",
        position: "bottom-right",
        autoClose: 2000,
      });
    } catch (error) {
      console.error("Error processing like:", error);
      toast.error(error.message || "좋아요 처리 중 오류가 발생했습니다.");
    } finally {
      setLikeLoading(false);
    }
  };

  // 댓글 기능 알림
  const handleCommentClick = () => {
    if (!user) {
      onRequireAuth && onRequireAuth();
      return;
    }
    setShowComments(!showComments);
  };

  // 댓글 작성 처리
  const handleSubmitComment = async (e) => {
    e.preventDefault();

    if (!user) {
      onRequireAuth && onRequireAuth();
      return;
    }

    if (!commentText.trim()) {
      toast.warning("댓글 내용을 입력해주세요.");
      return;
    }

    setIsSubmittingComment(true);
    try {
      const response = await fetch(`${API_URL}/posts/${post._id}/comments`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ text: commentText }),
      });

      if (!response.ok) {
        throw new Error("댓글 작성에 실패했습니다.");
      }

      const data = await response.json();

      // 부모 컴포넌트에 알림 (게시물 업데이트)
      if (onUpdatePost && data.post) {
        onUpdatePost(data.post);
      }

      // 폼 초기화
      setCommentText("");

      toast.success("댓글이 등록되었습니다.", {
        position: "bottom-right",
        autoClose: 2000,
      });
    } catch (error) {
      console.error("Error creating comment:", error);
      toast.error(error.message || "댓글 작성에 실패했습니다.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 댓글 입력시 엔터키 처리
  const handleCommentKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (commentText.trim() && !isSubmittingComment) {
        handleSubmitComment(e);
      }
    }
  };

  // 댓글 삭제 후 콜백
  const handleCommentDeleted = (data) => {
    if (onUpdatePost && data.post) {
      onUpdatePost(data.post);
    }
  };

  // 댓글 수정 후 콜백
  const handleCommentUpdated = (data) => {
    if (onUpdatePost && data.post) {
      onUpdatePost(data.post);
    }
  };

  // 프로필 이미지 URL 생성
  const getProfileImageUrl = (imageFilename) => {
    if (imageFilename) {
      // S3 URL인지 확인
      if (imageFilename.startsWith("http")) {
        return imageFilename;
      }
      // 로컬 파일인 경우
      return `${API_URL}/assets/profiles/${imageFilename}`;
    }
    return null;
  };

  // 현재 사용자 프로필 이미지 URL
  const getCurrentUserProfileImageUrl = () => {
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

  // 이니셜 표시 (이미지가 없는 경우)
  const getInitials = (username) => {
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    return "?";
  };

  // 프로필 모달 열기
  const openProfileModal = (e) => {
    e.stopPropagation();
    if (!user) {
      onRequireAuth && onRequireAuth();
      return;
    }
    setProfileUser({
      _id: post.author._id,
      username: post.author.username,
      profileImage: post.author.profileImage,
    });
    setShowProfileModal(true);
  };

  // 프로필 모달 닫기
  const closeProfileModal = () => {
    setShowProfileModal(false);
  };

  return (
    <div className="overflow-hidden mb-4 w-full max-w-2xl bg-white rounded-lg border shadow-md">
      <div className="p-4">
        <div className="flex items-center mb-3">
          <div
            className="flex overflow-hidden justify-center items-center mr-3 w-10 h-10 bg-gray-200 rounded-full cursor-pointer"
            onClick={openProfileModal}
          >
            {post.author?.profileImage ? (
              <img
                src={getProfileImageUrl(post.author.profileImage)}
                alt={post.author?.username || "프로필"}
                className="object-cover w-full h-full"
              />
            ) : (
              getInitials(post.author?.username)
            )}
          </div>
          <div>
            <h3
              className="font-semibold cursor-pointer hover:text-blue-600"
              onClick={goToAuthorFeed}
            >
              {post.author?.username || "알 수 없음"}
            </h3>
            <p className="text-xs text-gray-500">
              {new Date(post.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* 작성자일 경우 수정/삭제 드롭다운 표시 */}
          {isAuthor && (
            <div className="relative ml-auto">
              <button
                className="p-1 text-gray-500 rounded-full hover:bg-gray-100"
                onClick={toggleDropdown}
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
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>

              {showDropdown && (
                <div className="absolute right-0 z-10 mt-2 w-32 bg-white rounded border shadow-lg">
                  <button
                    onClick={openEditModal}
                    className="block px-4 py-2 w-full text-sm text-left text-gray-700 hover:bg-gray-100"
                  >
                    수정
                  </button>
                  <button
                    onClick={handleDeletePost}
                    className="block px-4 py-2 w-full text-sm text-left text-red-600 hover:bg-gray-100"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mb-3 text-gray-800">
          {isCompact && !showFullDescription && post.description.length > 30 ? (
            <>
              {post.description.substring(0, 30)}...
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullDescription(true);
                }}
                className="ml-1 text-blue-500 hover:underline"
              >
                더보기
              </button>
            </>
          ) : isCompact && showFullDescription ? (
            <>
              {post.description}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullDescription(false);
                }}
                className="ml-1 text-blue-500 hover:underline"
              >
                접기
              </button>
            </>
          ) : (
            post.description
          )}
        </p>

        {/* 이미지 갤러리 */}
        {post.images && post.images.length > 0 ? (
          <div className="relative mb-3">
            {/* 정사각형 비율의 컨테이너 (aspect-ratio 사용) */}
            <div
              className={`relative overflow-hidden bg-gray-100 rounded-md cursor-pointer ${
                isCompact
                  ? "inline-block mr-2 w-14 h-14"
                  : "mb-3 w-full h-96 rounded-md"
              }`}
              onClick={openImageModal}
            >
              {/* 이미지 슬라이더 - 수평 스크롤 방식 */}
              <div
                ref={sliderScrollRef}
                className="flex overflow-x-auto w-full h-full scrollbar-hide snap-x snap-mandatory"
                style={{
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                }}
              >
                {post.images.map((image, idx) => (
                  <div
                    key={`slide-${idx}`}
                    className="flex-shrink-0 w-full h-full snap-center"
                    style={{ minWidth: "100%" }}
                  >
                    <img
                      src={
                        image.startsWith("http")
                          ? image
                          : `${API_URL}/assets/images/${image}`
                      }
                      alt={`게시물 이미지 ${idx + 1}`}
                      className="object-cover w-full h-full"
                    />
                  </div>
                ))}
              </div>

              {/* 이미지가 여러 개인 경우에만 컨트롤 표시 */}
              {post.images.length > 1 && !isCompact && (
                <>
                  {/* 좌우 화살표 */}
                  <button
                    className="absolute left-3 top-1/2 p-2 text-white bg-black bg-opacity-50 rounded-full transform -translate-y-1/2 hover:bg-opacity-70"
                    onClick={prevImage}
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
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    className="absolute right-3 top-1/2 p-2 text-white bg-black bg-opacity-50 rounded-full transform -translate-y-1/2 hover:bg-opacity-70"
                    onClick={nextImage}
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
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>

                  {/* 인디케이터 점 */}
                  <div className="flex absolute right-0 left-0 bottom-3 justify-center">
                    {post.images.map((_, index) => (
                      <div
                        key={index}
                        className={`h-3 w-3 mx-1 rounded-full cursor-pointer ${
                          index === currentImageIndex
                            ? "bg-white"
                            : "bg-gray-400 bg-opacity-70"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToSlide(index);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* 여러 이미지 표시 아이콘 - 컴팩트 모드와 일반 모드 모두 */}
              {post.images.length > 1 && (
                <div
                  className={`absolute top-0 right-0 ${
                    isCompact ? "px-1 py-0.5 text-xs" : "px-2 py-1 text-sm"
                  } font-bold text-white bg-blue-500 rounded-bl-md`}
                >
                  +{post.images.length - 1}
                </div>
              )}
            </div>
          </div>
        ) : post.image ? (
          // 이전 버전과의 호환성을 위해 단일 이미지 지원
          <div className="mb-3">
            <div
              className={`overflow-hidden bg-gray-100 cursor-pointer ${
                isCompact
                  ? "inline-block w-14 h-14 rounded-md"
                  : "w-full h-96 rounded-md"
              }`}
              onClick={openImageModal}
            >
              <img
                src={
                  post.image.startsWith("http")
                    ? post.image
                    : `${API_URL}/assets/images/${post.image}`
                }
                alt="게시물 이미지"
                className="object-cover w-full h-full"
              />
            </div>
          </div>
        ) : null}

        <div className="flex pt-3 border-t">
          <button
            className={`flex items-center mr-4 ${
              isLikedByCurrentUser ? "text-red-500" : "text-gray-600"
            } transition-colors duration-200`}
            onClick={handleLike}
            disabled={likeLoading}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-5 h-5 mr-1 ${likeLoading ? "animate-pulse" : ""}`}
              fill={isLikedByCurrentUser ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            좋아요 {post.likes?.length || 0}
          </button>
          <button
            className="flex items-center text-gray-600"
            onClick={handleCommentClick}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mr-1 w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            댓글 {post.comments?.length || 0}
          </button>
        </div>

        {/* 댓글 섹션 */}
        {showComments && (
          <div className="pt-3 mt-4 border-t">
            {/* 댓글 목록 */}
            <div className="mb-3">
              {post.comments && post.comments.length > 0 ? (
                <div className="comments-list">
                  {post.comments.map((comment) => (
                    <CommentItem
                      key={comment._id}
                      comment={comment}
                      postId={post._id}
                      onDeleteComment={handleCommentDeleted}
                      onUpdateComment={handleCommentUpdated}
                    />
                  ))}
                </div>
              ) : (
                <p className="py-2 text-sm text-center text-gray-500">
                  아직 댓글이 없습니다.
                </p>
              )}
            </div>

            {/* 댓글 작성 폼 */}
            <form onSubmit={handleSubmitComment} className="flex items-start">
              <div className="flex overflow-hidden justify-center items-center mr-2 w-8 h-8 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full">
                {user?.profileImage ? (
                  <img
                    src={getCurrentUserProfileImageUrl()}
                    alt="프로필"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  getInitials(user?.username)
                )}
              </div>
              <div className="relative flex-1">
                <textarea
                  className="px-3 py-2 pr-16 w-full text-sm rounded-3xl border focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="댓글을 입력하세요."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  rows={1}
                  style={{ resize: "none" }}
                />
                <button
                  type="submit"
                  className="absolute top-2 right-3 text-blue-500 hover:text-blue-700 disabled:opacity-50"
                  disabled={isSubmittingComment || !commentText.trim()}
                >
                  {isSubmittingComment ? (
                    <svg
                      className="w-5 h-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
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
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* 이미지 모달 */}
      {showModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black bg-opacity-80"
            onClick={closeImageModal}
          >
            <div
              className="relative max-w-4xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 닫기 버튼 */}
              <button
                className="absolute right-0 -top-10 p-2 text-white bg-black bg-opacity-50 rounded-full hover:bg-opacity-70"
                onClick={closeImageModal}
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

              {/* 원본 이미지 */}
              <img
                src={getCurrentImageUrl()}
                alt="원본 이미지"
                className="max-w-full max-h-[80vh] object-contain"
              />

              {/* 이미지가 여러 개인 경우 네비게이션 버튼 */}
              {post.images && post.images.length > 1 && (
                <>
                  <button
                    className="absolute left-2 top-1/2 p-3 text-white bg-black bg-opacity-50 rounded-full transform -translate-y-1/2 hover:bg-opacity-70"
                    onClick={prevImage}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                  <button
                    className="absolute right-2 top-1/2 p-3 text-white bg-black bg-opacity-50 rounded-full transform -translate-y-1/2 hover:bg-opacity-70"
                    onClick={nextImage}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-8 h-8"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>

                  {/* 이미지 카운터 */}
                  <div className="absolute right-0 left-0 bottom-4 text-center text-white">
                    {currentImageIndex + 1} / {post.images.length}
                  </div>

                  {/* 인디케이터 점 */}
                  <div className="flex absolute right-0 left-0 bottom-10 justify-center">
                    {post.images.map((_, index) => (
                      <div
                        key={`modal-dot-${index}`}
                        className={`h-3 w-3 mx-1 rounded-full cursor-pointer ${
                          index === currentImageIndex
                            ? "bg-white"
                            : "bg-gray-400 bg-opacity-70"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          goToSlide(index);
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* 수정 모달 */}
      {showEditModal && (
        <div
          className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-black bg-opacity-50"
          onClick={closeEditModal}
        >
          <div
            className="p-6 w-full max-w-lg bg-white rounded-lg shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">게시물 수정</h3>
              <button
                className="p-1 text-gray-500 rounded-full hover:bg-gray-100"
                onClick={closeEditModal}
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

            <form onSubmit={handleUpdatePost}>
              <div className="mb-4">
                <textarea
                  className="p-3 w-full rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="무엇을 공유하고 싶으신가요?"
                  rows="5"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              {/* 기존 이미지 표시 */}
              {originalImages.length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 font-medium">현재 이미지</h4>
                  <div className="flex flex-wrap gap-2">
                    {originalImages.map((image, index) => (
                      <div
                        key={`original-${index}`}
                        className="relative w-20 h-20"
                      >
                        {imagesToRemove.includes(image) ? (
                          <div className="relative w-full h-full">
                            <img
                              src={
                                image.startsWith("http")
                                  ? image
                                  : `${API_URL}/assets/images/${image}`
                              }
                              alt={`이미지 ${index}`}
                              className="object-cover w-full h-full"
                            />
                            <button
                              className="absolute top-1 right-1 text-red-500 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRestoreImage(image);
                              }}
                            >
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="relative w-full h-full">
                            <img
                              src={
                                image.startsWith("http")
                                  ? image
                                  : `${API_URL}/assets/images/${image}`
                              }
                              alt={`이미지 ${index}`}
                              className="object-cover w-full h-full"
                            />
                            <button
                              className="absolute top-1 right-1 text-blue-500 hover:text-blue-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveOriginalImage(image);
                              }}
                            >
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="p-3 mt-4 w-full text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <svg
                    className="w-5 h-5 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : (
                  "게시물 수정"
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 사용자 프로필 모달 */}
      {showProfileModal && (
        <UserProfileModal
          user={profileUser}
          isOpen={showProfileModal}
          onClose={closeProfileModal}
          onViewFeed={goToAuthorFeed}
        />
      )}
    </div>
  );
};

export default PostItem;
