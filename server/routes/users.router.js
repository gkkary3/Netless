const express = require("express");
const usersRouter = express.Router();
const {
  checkAuthenticated,
  checkNotAuthenticated,
} = require("../middlewares/auth");
const passport = require("passport");
const User = require("../models/users.model");
const sendMail = require("./mail/mail");
const emailVerificationStore = {};

usersRouter.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
    if (!user) {
      return res
        .status(401)
        .json({ error: info?.msg || "로그인에 실패했습니다." });
    }

    req.login(user, async (err) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "로그인 처리 중 에러가 발생했습니다." });
      }

      // 온라인 상태 업데이트
      try {
        await User.findByIdAndUpdate(user._id, {
          isOnline: true,
          lastSeen: new Date(),
        });
      } catch (updateErr) {
        console.error("온라인 상태 업데이트 실패:", updateErr);
      }

      // JSON API 요청인지 확인
      if (
        req.xhr ||
        req.headers.accept === "application/json" ||
        req.headers["content-type"]?.includes("application/json")
      ) {
        return res.json({ success: true, user });
      } else {
        // 웹 요청인 경우 리다이렉트 (소셜 로그인과 동일하게)
        return res.redirect(
          `${process.env.CLIENT_URL || "http://localhost:3000"}/posts`
        );
      }
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

usersRouter.post("/logout", async (req, res, next) => {
  const userId = req.user?._id;

  req.logOut(async function (err) {
    if (err) {
      return res
        .status(500)
        .json({ error: "로그아웃 중 오류가 발생했습니다." });
    }

    // 온라인 상태 업데이트
    if (userId) {
      try {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
      } catch (updateErr) {
        console.error("오프라인 상태 업데이트 실패:", updateErr);
      }
    }

    return res.json({ success: true });
  });
});

usersRouter.post("/signup", async (req, res) => {
  // user 객체 생성
  const user = new User(req.body);
  try {
    await user.save();

    req.login(user, (err) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "로그인 처리 중 오류가 발생했습니다." });
      }

      const userResponse = {
        id: user._id,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
      };
      return res.status(201).json({ success: true, user: userResponse });
    });
    //이메일 보내기
    // sendMail("nambawon1@naver.com", "Park sangmin", "welcome");
  } catch (err) {
    return res.status(500).json({ error: "회원가입 중 오류가 발생했습니다." });
  }
});

usersRouter.get("/google", passport.authenticate("google"));

usersRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    successReturnToOrRedirect:
      (process.env.CLIENT_URL || "http://localhost:3000") + "/posts",
    failureRedirect:
      (process.env.CLIENT_URL || "http://localhost:3000") + "/login",
  })
);

usersRouter.get("/kakao", passport.authenticate("kakao"));

usersRouter.get(
  "/kakao/callback",
  passport.authenticate("kakao", {
    successReturnToOrRedirect:
      (process.env.CLIENT_URL || "http://localhost:3000") + "/posts",
    failureRedirect:
      (process.env.CLIENT_URL || "http://localhost:3000") + "/login",
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

usersRouter.post("/send-verification-code", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "이메일이 필요합니다." });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  try {
    await sendMail(email, code, "verification");
  } catch (err) {
    return res.status(500).json({ error: "이메일 발송에 실패했습니다." });
  }

  emailVerificationStore[email] = { code, expiresAt };

  return res.json({ success: true, message: "인증번호가 발송되었습니다." });
});

usersRouter.post("/verify-code", (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: "이메일과 인증번호가 필요합니다." });
  }

  const record = emailVerificationStore[email];
  if (!record) {
    return res.status(400).json({ error: "인증번호를 먼저 발급받으세요." });
  }

  if (Date.now() > record.expiresAt) {
    delete emailVerificationStore[email];
    return res.status(400).json({ error: "인증번호가 만료되었습니다." });
  }

  if (record.code !== code) {
    return res.status(400).json({ error: "인증번호가 일치하지 않습니다." });
  }

  // 인증 성공: 인증 완료 표시(예: verified: true)
  record.verified = true;

  return res.json({ success: true, message: "이메일 인증이 완료되었습니다." });
});

// 로그인 후 리다이렉트 전용 엔드포인트
usersRouter.get("/redirect-after-login", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "로그인이 필요합니다." });
  }

  // 인증된 사용자를 CLIENT_URL/posts로 리다이렉트
  return res.redirect(
    `${process.env.CLIENT_URL || "http://localhost:3000"}/posts`
  );
});

module.exports = usersRouter;
