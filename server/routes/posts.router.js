const express = require("express");
const {
  checkAuthenticated,
  checkPostOwnerShip,
} = require("../middlewares/auth");
const router = express.Router();
const Post = require("../models/posts.model");
const Comment = require("../models/comments.model");
const { postUpload, deleteFromS3 } = require("../config/s3");

// 업로드 미들웨어 에러 처리를 위한 래퍼 함수
const uploadMiddleware = (req, res, next) => {
  const upload = postUpload.array("images", 5);
  upload(req, res, function (err) {
    if (err) {
      console.error("게시물 이미지 업로드 에러:", err);
      return res.status(400).json({
        success: false,
        message: "파일 업로드 오류: " + err.message,
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
      let images = req.files ? req.files.map((file) => file.location) : []; // S3 URL 사용

      const post = new Post({
        description: desc,
        images: images,
        author: req.user._id, // 사용자 ID만 저장
      });

      await post.save();

      // 생성된 게시물을 populate해서 반환
      const populatedPost = await Post.findById(post._id).populate(
        "author",
        "username email profileImage"
      );

      // API 응답
      res.status(201).json({
        success: true,
        message: "포스트가 성공적으로 등록되었습니다!",
        post: populatedPost,
      });
    } catch (err) {
      // 오류 로그 제거
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get("/", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", "username email profileImage") // 작성자 정보 populate
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "username email profileImage", // 댓글 작성자 정보도 populate
        },
      })
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    console.error("게시물 조회 오류:", err);
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

      // 삭제할 이미지 파일을 S3에서 제거
      for (const imageUrl of imagesToRemove) {
        const imageKey = imageUrl.includes("amazonaws.com")
          ? imageUrl.split("/").slice(-2).join("/") // posts/filename 형태로 추출
          : imageUrl; // 이미 키 형태인 경우

        if (imageKey.startsWith("posts/")) {
          await deleteFromS3(imageKey);
        }
      }

      // 이미지 배열에서 삭제할 이미지 제거
      post.images = post.images
        ? post.images.filter((img) => !imagesToRemove.includes(img))
        : [];
    }

    // 새로 업로드된 이미지 처리
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => file.location); // S3 URL 사용

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

    // 수정된 게시물을 populate해서 반환
    const populatedPost = await Post.findById(post._id)
      .populate("author", "username email profileImage")
      .populate({
        path: "comments",
        populate: {
          path: "author",
          select: "username email profileImage",
        },
      });

    // API 응답
    if (req.xhr || req.headers.accept.includes("application/json")) {
      return res.json({
        success: true,
        message: "포스트가 성공적으로 수정되었습니다!",
        post: populatedPost,
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
