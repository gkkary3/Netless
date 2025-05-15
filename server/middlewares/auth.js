const Comment = require("../models/comments.model");
const Post = require("../models/posts.model");
const User = require("../models/users.model");

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  // JSON API 요청인 경우 JSON 응답 반환
  if (
    req.xhr ||
    req.headers.accept === "application/json" ||
    req.headers["content-type"]?.includes("application/json") ||
    req.headers["content-type"]?.includes("multipart/form-data")
  ) {
    return res.status(401).json({
      success: false,
      message: "인증이 필요합니다. 로그인 후 다시 시도해주세요.",
    });
  }

  // 웹 요청인 경우 리디렉션
  res.redirect(process.env.CLIENT_URL || "http://localhost:3000");
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect(`${process.env.CLIENT_URL}/posts`);
  }
  next();
}

async function checkPostOwnerShip(req, res, next) {
  if (req.isAuthenticated()) {
    try {
      const foundPost = await Post.findById(req.params.id);
      if (!foundPost) {
        req.flash("error", "포스트를 찾을 수 없습니다!");
        console.log("포스트를 찾을 수 없습니다!");
        return res.redirect(`${process.env.CLIENT_URL}/posts`);
      }
      if (foundPost.author.id.equals(req.user._id)) {
        req.post = foundPost;
        next();
      } else {
        req.flash("error", "권한이 없습니다!");
        console.log("권한이 없습니다!");
        return res.redirect(`${process.env.CLIENT_URL}/posts`);
      }
    } catch (err) {
      req.flash("error", "오류가 발생했습니다!");
      console.log("오류가 발생했습니다!");
      return res.redirect(`${process.env.CLIENT_URL}/posts`);
    }
  } else {
    req.flash("error", "로그인 후 이용해주세요!");
    console.log("로그인 후 이용해주세요!");
    res.redirect(process.env.CLIENT_URL || "http://localhost:3000/login");
  }
}

async function checkCommentOwnerShip(req, res, next) {
  if (req.isAuthenticated()) {
    try {
      const foundComment = await Comment.findById(req.params.commentId);
      if (!foundComment) {
        req.flash("error", "댓글을 찾을 수 없습니다!");
        return res.redirect(`${process.env.CLIENT_URL}/posts`);
      }
      if (foundComment.author.id.equals(req.user._id)) {
        req.comment = foundComment;
        next();
      } else {
        req.flash("error", "권한이 없습니다!");
        return res.redirect(`${process.env.CLIENT_URL}/posts`);
      }
    } catch (err) {
      req.flash("error", "오류가 발생했습니다!");
      return res.redirect(`${process.env.CLIENT_URL}/posts`);
    }
  } else {
    req.flash("error", "로그인 후 이용해주세요!");
    res.redirect(process.env.CLIENT_URL || "http://localhost:3000/login");
  }
}

async function checkIsMe(req, res, next) {
  if (req.isAuthenticated()) {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        req.flash("error", "User not found");
        return res.redirect(
          `${process.env.CLIENT_URL}/profile/` + req.user._id
        );
      }
      if (user._id.equals(req.user._id)) {
        return next();
      } else {
        req.flash("error", "Permission denied");
        return res.redirect(
          `${process.env.CLIENT_URL}/profile/` + req.user._id
        );
      }
    } catch (err) {
      req.flash("error", "User not found");
      return res.redirect(`${process.env.CLIENT_URL}/profile/` + req.user._id);
    }
  } else {
    req.flash("error", "Please Login first!");
    res.redirect(process.env.CLIENT_URL || "http://localhost:3000/login");
  }
}
module.exports = {
  checkAuthenticated,
  checkNotAuthenticated,
  checkPostOwnerShip,
  checkCommentOwnerShip,
  checkIsMe,
};
