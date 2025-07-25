const express = require("express");
const { checkAuthenticated, checkIsMe } = require("../middlewares/auth");
const Post = require("../models/posts.model");
const User = require("../models/users.model");
const router = express.Router({ mergeParams: true });
const { profileUpload, deleteFromS3 } = require("../config/s3");

// 업로드 미들웨어 에러 처리를 위한 래퍼 함수
const uploadMiddleware = (req, res, next) => {
  console.log("프로필 이미지 업로드 시작");
  console.log("요청 파라미터:", req.params);
  console.log("사용자:", req.user?._id);

  const upload = profileUpload.single("profileImage");
  upload(req, res, function (err) {
    if (err) {
      console.error("프로필 이미지 업로드 에러:", err);
      return res.status(400).json({
        success: false,
        message: "파일 업로드 오류: " + err.message,
      });
    }
    console.log("업로드된 파일 정보:", req.file);
    next();
  });
};

// 사용자 프로필 정보 조회
router.get("/", checkAuthenticated, async (req, res) => {
  try {
    // 사용자 정보 조회
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    // 사용자가 작성한 게시물을 찾아 comments를 populate하고 생성일 기준 내림차순 정렬
    const posts = await Post.find({ author: req.params.id })
      .populate("author", "username email profileImage")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "username email profileImage",
        },
      })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      user: user,
      posts: posts,
    });
  } catch (err) {
    console.error("프로필 조회 오류:", err);
    return res.status(500).json({
      success: false,
      message: "서버 오류: " + (err.message || "알 수 없는 오류"),
      error: err.toString(),
    });
  }
});

// 현재 로그인한 사용자 정보 조회
router.get("/me", checkAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자 정보를 찾을 수 없습니다.",
      });
    }

    return res.status(200).json({
      success: true,
      user: user,
    });
  } catch (err) {
    console.error("내 프로필 조회 오류:", err);
    return res.status(500).json({
      success: false,
      message: "서버 오류: " + (err.message || "알 수 없는 오류"),
      error: err.toString(),
    });
  }
});

// 프로필 정보 업데이트
router.put("/", checkIsMe, async (req, res) => {
  try {
    const { username, introduction, contact, workspace } = req.body;

    // 업데이트할 필드들
    const updateFields = {};
    if (username) updateFields.username = username;
    if (introduction !== undefined) updateFields.introduction = introduction;
    if (contact) updateFields.contact = contact;
    if (workspace) updateFields.workspace = workspace;

    const user = await User.findByIdAndUpdate(req.params.id, updateFields, {
      new: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "프로필 정보가 업데이트되었습니다.",
      user: user,
    });
  } catch (err) {
    console.error("프로필 업데이트 오류:", err);
    return res.status(500).json({
      success: false,
      message: "서버 오류: " + (err.message || "알 수 없는 오류"),
      error: err.toString(),
    });
  }
});

// 프로필 이미지 업로드
router.put("/image", checkIsMe, uploadMiddleware, async (req, res) => {
  try {
    console.log("프로필 이미지 업로드 API 호출됨");
    console.log("요청 파라미터 ID:", req.params.id);
    console.log("현재 사용자 ID:", req.user?._id);
    console.log("업로드된 파일:", req.file);

    // 이미지 파일이 없는 경우
    if (!req.file) {
      console.log("파일이 없음");
      return res.status(400).json({
        success: false,
        message: "이미지 파일이 필요합니다.",
      });
    }

    // 기존 프로필 이미지가 있다면 S3에서 삭제
    const user = await User.findById(req.params.id);
    console.log("기존 사용자 정보:", {
      id: user._id,
      profileImage: user.profileImage,
    });

    if (user.profileImage) {
      try {
        // S3 URL에서 키 추출
        const imageKey = user.profileImage.includes("amazonaws.com")
          ? user.profileImage.split("/").slice(-2).join("/") // profiles/filename 형태로 추출
          : user.profileImage; // 이미 키 형태인 경우

        console.log("삭제할 이미지 키:", imageKey);

        if (imageKey.startsWith("profiles/")) {
          await deleteFromS3(imageKey);
          console.log("기존 이미지 삭제 완료");
        }
      } catch (deleteError) {
        console.error("기존 이미지 삭제 실패 (계속 진행):", deleteError);
        // 삭제 실패해도 새 이미지 업로드는 계속 진행
      }
    }

    console.log("새 이미지 URL:", req.file.location);

    // 프로필 이미지 업데이트 (S3 URL 저장)
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { profileImage: req.file.location }, // S3 URL 저장
      { new: true }
    ).select("-password");

    console.log("사용자 정보 업데이트 완료:", updatedUser._id);

    return res.status(200).json({
      success: true,
      message: "프로필 이미지가 업데이트되었습니다.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("프로필 이미지 업로드 오류:", err);
    console.error("오류 스택:", err.stack);
    return res.status(500).json({
      success: false,
      message: "서버 오류: " + (err.message || "알 수 없는 오류"),
      error: err.toString(),
    });
  }
});

module.exports = router;
