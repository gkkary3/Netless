import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";

const PostForm = ({ onPostCreated }) => {
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:4000";
  const { user } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      toast.warning("내용을 입력해주세요.");
      return; // 빈 게시물 방지
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("desc", description);

      // 여러 이미지 추가
      if (images.length > 0) {
        images.forEach((image) => {
          formData.append("images", image);
        });
      }

      const response = await fetch(`${API_URL}/posts`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "게시물 작성에 실패했습니다.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          console.error("응답 파싱 오류:", e);
        }
        throw new Error(errorMessage);
      }

      // 폼 초기화 및 모달 닫기
      setDescription("");
      setImages([]);
      setShowModal(false);

      // 부모 컴포넌트에 알림
      if (onPostCreated) {
        onPostCreated();
      }

      // 성공 메시지 표시
      toast.success("게시물이 등록되었습니다! 🎉", {
        position: "bottom-right",
        autoClose: 3000,
      });
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error(error.message || "게시물 작성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 이미지 선택 처리
  const handleImageChange = (e) => {
    if (e.target.files) {
      const newImages = Array.from(e.target.files);
      if (newImages.length + images.length > 5) {
        toast.info("최대 5개의 이미지만 업로드할 수 있습니다.", {
          icon: "ℹ️",
        });
        return;
      }
      setImages((prev) => [...prev, ...newImages]);
    }
  };

  // 이미지 삭제 처리
  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index));
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

  // 프로필 이니셜 표시
  const getInitials = () => {
    if (user?.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return "?";
  };

  return (
    <>
      {/* 상단 고정 게시물 작성 폼 (간단 버전) */}
      <div className="sticky z-10 w-full max-w-2xl p-4 mb-6 bg-white border-2 border-blue-100 rounded-lg shadow-lg top-16">
        <div className="flex items-center">
          <div className="flex items-center justify-center w-10 h-10 mr-3 overflow-hidden font-semibold text-blue-600 bg-blue-100 rounded-full">
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
          <div
            className="flex items-center w-full p-3 font-medium text-blue-600 transition-all duration-200 rounded-full shadow-sm cursor-pointer bg-blue-50 hover:bg-blue-100"
            onClick={() => setShowModal(true)}
          >
            <span className="ml-2">무슨 생각을 하고 계신가요?</span>
          </div>
        </div>
      </div>

      {/* 게시물 작성 모달 */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-lg bg-white rounded-lg">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">게시물 만들기</h2>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowModal(false)}
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
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-4">
                <div className="flex items-center mb-4">
                  <div className="flex items-center justify-center w-10 h-10 mr-3 overflow-hidden font-semibold text-gray-700 bg-gray-200 rounded-full">
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
                  <div>
                    <h3 className="font-semibold">
                      {user?.username || user?.email || "사용자"}
                    </h3>
                  </div>
                </div>

                <textarea
                  className="w-full p-3 text-lg border-0 focus:outline-none focus:ring-0"
                  placeholder="무슨 생각을 하고 계신가요?"
                  rows="5"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  autoFocus
                ></textarea>

                {/* 이미지 미리보기 */}
                {images.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <div className="flex pb-2 space-x-2">
                      {images.map((image, index) => (
                        <div key={index} className="relative flex-shrink-0">
                          <img
                            src={URL.createObjectURL(image)}
                            alt={`미리보기 ${index + 1}`}
                            className="object-cover w-32 h-32 rounded"
                          />
                          <button
                            type="button"
                            className="absolute p-1 text-white bg-gray-800 rounded-full top-1 right-1 bg-opacity-70"
                            onClick={() => handleRemoveImage(index)}
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
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="inline-flex items-center p-2 rounded-lg cursor-pointer hover:bg-gray-100">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 mr-1 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span className="text-sm font-medium">
                        사진 {images.length > 0 ? `(${images.length}/5)` : ""}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        disabled={images.length >= 5}
                      />
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-24 px-6 py-2 font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || !description.trim()}
                  >
                    {loading ? "게시 중..." : "게시"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PostForm;
