const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  checkAuthenticated,
  checkPostOwnerShip,
} = require("../middlewares/auth");
const router = express.Router();
const Post = require("../models/posts.model");
const Comment = require("../models/comments.model");

// 이미지 저장 경로 확인 및 생성
const uploadDir = path.join(__dirname, "../public/assets/images");
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
    const newFilename = file.fieldname + "-" + uniqueSuffix + extension;
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
    fileSize: 10 * 1024 * 1024, // 10MB
  },
}).array("images", 5);

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

// 인증 체크 및 업로드 미들웨어 적용
router.post(
  "/",
  checkAuthenticated,
  uploadMiddleware,
  async (req, res, next) => {
    try {
      let desc = req.body.desc;
      let images = req.files ? req.files.map((file) => file.filename) : [];

      const post = new Post({
        description: desc,
        images: images,
        author: {
          id: req.user._id,
          username: req.user.username,
          profileImage: req.user.profileImage,
        },
      });

      await post.save();

      // API 응답
      res.status(201).json({
        success: true,
        message: "포스트가 성공적으로 등록되었습니다!",
        post: post,
      });
    } catch (err) {
      console.error("게시물 저장 오류:", err);
      res.status(500).json({
        success: false,
        message: "서버 오류: " + (err.message || "알 수 없는 오류"),
        error: err.toString(),
      });
    }
  }
);

router.get("/", checkAuthenticated, async (req, res) => {
  try {
    // User 모델 참조를 위해 require
    const User = require("../models/users.model");

    const posts = await Post.find()
      .populate("comments")
      .sort({ createdAt: -1 });

    // 최신 프로필 정보 반영
    const updatedPosts = await Promise.all(
      posts.map(async (post) => {
        const postObj = post.toObject();
        if (post.author && post.author.id) {
          const user = await User.findById(post.author.id).select(
            "profileImage"
          );
          if (user && user.profileImage) {
            postObj.author.profileImage = user.profileImage;
          }
        }
        return postObj;
      })
    );

    res.json(updatedPosts);
  } catch (err) {
    console.log(err);
    return res.status(500).send("Internal Server Error");
  }
});

// router.get("/:id/edit", checkPostOwnerShip, async (req, res) => {
//   res.render("posts/edit", {
//     post: req.post,
//   });
// });

router.put("/:id", checkPostOwnerShip, uploadMiddleware, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "포스트를 찾을 수 없습니다.",
      });
    }

    // 설명 업데이트
    post.description = req.body.description;

    // 기존 이미지 중 삭제할 이미지 처리
    if (req.body.imagesToRemove) {
      const imagesToRemove = Array.isArray(req.body.imagesToRemove)
        ? req.body.imagesToRemove
        : [req.body.imagesToRemove];

      // 삭제할 이미지 파일을 서버에서 제거
      imagesToRemove.forEach((filename) => {
        const imagePath = path.join(uploadDir, filename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      });

      // 이미지 배열에서 삭제할 이미지 제거
      post.images = post.images
        ? post.images.filter((img) => !imagesToRemove.includes(img))
        : [];
    }

    // 새로 업로드된 이미지 처리
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => file.filename);

      // 이미지 배열 업데이트 (기존 이미지 + 새 이미지)
      if (!post.images) {
        post.images = newImages;
      } else {
        post.images = [...post.images, ...newImages];
      }
    }

    // 이미지 배열이 비어있을 경우 undefined로 설정
    if (post.images && post.images.length === 0) {
      post.images = undefined;
    }

    // 게시물 저장
    await post.save();

    // API 응답
    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.json({
        success: true,
        message: "포스트가 성공적으로 수정되었습니다!",
        post: post,
      });
    } else {
      req.flash("success", "포스트가 성공적으로 수정되었습니다!");
      const redirectUrl = req.get("Referer") || "/";
      res.redirect(redirectUrl);
    }
  } catch (err) {
    console.error("포스트 수정 오류:", err);

    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(500).json({
        success: false,
        message: "서버 오류: " + (err.message || "알 수 없는 오류"),
        error: err.toString(),
      });
    } else {
      req.flash("error", "포스트 수정에 실패했습니다.");
      const redirectUrl = req.get("Referer") || "/";
      res.redirect(redirectUrl);
    }
  }
});

router.delete("/:id", checkPostOwnerShip, async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);

    // JSON API 요청과 웹 요청 구분
    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.json({
        success: true,
        message: "포스트가 성공적으로 삭제되었습니다!",
      });
    } else {
      req.flash("success", "포스트가 성공적으로 삭제되었습니다!");
      const redirectUrl = req.get("Referer") || "/";
      res.redirect(redirectUrl);
    }
  } catch (err) {
    console.error("포스트 삭제 오류:", err);

    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.status(500).json({
        success: false,
        message: "서버 오류: " + (err.message || "알 수 없는 오류"),
        error: err.toString(),
      });
    } else {
      req.flash("error", "포스트 삭제에 실패했습니다.");
      const redirectUrl = req.get("Referer") || "/";
      res.redirect(redirectUrl);
    }
  }
});
module.exports = router;
