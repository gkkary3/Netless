const express = require("express");
const { checkAuthenticated, checkIsMe } = require("../middlewares/auth");
const Post = require("../models/posts.model");
const User = require("../models/users.model");
const router = express.Router({ mergeParams: true });
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// 프로필 이미지 저장 경로 확인 및 생성
const uploadDir = path.join(__dirname, "../public/assets/profiles");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer 스토리지 엔진 설정
const storageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const newFilename = "profile-" + uniqueSuffix + extension;
    cb(null, newFilename);
  },
});

// 파일 필터 추가
const fileFilter = (req, file, cb) => {
  // 허용할 이미지 형식 체크
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("지원하지 않는 파일 형식입니다: " + file.mimetype), false);
  }
};

// multer 설정
const upload = multer({
  storage: storageEngine,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
}).single("profileImage");

// 업로드 미들웨어 에러 처리를 위한 래퍼 함수
const uploadMiddleware = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error("Multer 에러:", err);
      return res.status(400).json({
        success: false,
        message: "파일 업로드 오류: " + err.message,
      });
    } else if (err) {
      console.error("알 수 없는 에러:", err);
      return res.status(500).json({
        success: false,
        message: "파일 처리 중 오류 발생: " + err.message,
      });
    }
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
    const posts = await Post.find({ "author.id": req.params.id })
      .populate("comments")
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
    // 이미지 파일이 없는 경우
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "이미지 파일이 필요합니다.",
      });
    }

    // 기존 프로필 이미지가 있다면 삭제
    const user = await User.findById(req.params.id);
    if (user.profileImage) {
      const oldImagePath = path.join(uploadDir, user.profileImage);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // 프로필 이미지 업데이트
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { profileImage: req.file.filename },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "프로필 이미지가 업데이트되었습니다.",
      user: updatedUser,
    });
  } catch (err) {
    console.error("프로필 이미지 업로드 오류:", err);
    return res.status(500).json({
      success: false,
      message: "서버 오류: " + (err.message || "알 수 없는 오류"),
      error: err.toString(),
    });
  }
});

module.exports = router;
