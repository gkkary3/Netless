const express = require("express");
const usersRouter = express.Router();
const {
  checkAuthenticated,
  checkNotAuthenticated,
} = require("../middlewares/auth");
const passport = require("passport");
const User = require("../models/users.model");
const sendMail = require("./mail/mail");

usersRouter.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ error: "서버 에러가 발생했습니다." });
    }
    if (!user) {
      return res
        .status(401)
        .json({ error: info?.msg || "로그인에 실패했습니다." });
    }

    req.login(user, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "로그인 처리 중 에러가 발생했습니다." });
      }
      return res.json({ success: true, user });
    });
  })(req, res, next);
});

usersRouter.get("/check", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({ authenticated: true, user: req.user });
  } else {
    return res.json({ authenticated: false });
  }
});

usersRouter.post("/logout", (req, res, next) => {
  req.logOut(function (err) {
    if (err) {
      return res
        .status(500)
        .json({ error: "로그아웃 중 오류가 발생했습니다." });
    }
    return res.json({ success: true });
  });
});

usersRouter.post("/signup", async (req, res) => {
  // user 객체 생성
  const user = new User(req.body);
  try {
    await user.save();
    //이메일 보내기
    // sendMail("nambawon1@naver.com", "Park sangmin", "welcome");

    return res.status(201).json({ success: true });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: "회원가입 중 오류가 발생했습니다." });
  }
});

usersRouter.get("/google", passport.authenticate("google"));

usersRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    successReturnToOrRedirect:
      process.env.CLIENT_URL || "http://localhost:3000" + "/posts",
    failureRedirect:
      process.env.CLIENT_URL || "http://localhost:3000" + "/login",
  })
);

usersRouter.get("/kakao", passport.authenticate("kakao"));

usersRouter.get(
  "/kakao/callback",
  passport.authenticate("kakao", {
    successReturnToOrRedirect:
      process.env.CLIENT_URL || "http://localhost:3000" + "/posts",
    failureRedirect:
      process.env.CLIENT_URL || "http://localhost:3000" + "/login",
  })
);

// 개별 사용자 정보 조회 API는 마지막에 배치
usersRouter.get("/:id", checkAuthenticated, async (req, res) => {
  try {
    const userId = req.params.id;

    // 사용자 정보 조회 (민감한 정보 제외)
    const user = await User.findById(userId).select(
      "-password -googleId -kakaoId"
    );

    if (!user) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }

    return res.json({ user });
  } catch (err) {
    console.error("사용자 정보 조회 오류:", err);
    return res
      .status(500)
      .json({ error: "사용자 정보를 가져오는데 실패했습니다." });
  }
});

module.exports = usersRouter;
