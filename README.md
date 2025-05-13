# Express Passport 인증 시스템 프로젝트

## 목차

1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [프로젝트 구조](#프로젝트-구조)
4. [설치 방법](#설치-방법)
5. [단계별 구현 가이드](#단계별-구현-가이드)
6. [주요 기능 설명](#주요-기능-설명)
7. [파일 흐름 및 연관 관계](#파일-흐름-및-연관-관계)
8. [응용 및 확장 방법](#응용-및-확장-방법)

## 프로젝트 개요

이 프로젝트는 Express.js와 Passport.js를 활용한 사용자 인증 시스템입니다. 로컬 인증(이메일/비밀번호), Google OAuth, Kakao OAuth를 지원하며, 회원가입 시 환영 이메일을 발송하는 기능도 포함하고 있습니다. MongoDB를 데이터베이스로 사용하고, EJS 템플릿 엔진으로 뷰를 렌더링합니다.

## 기술 스택

- **백엔드**: Node.js, Express.js
- **인증**: Passport.js, JWT
- **데이터베이스**: MongoDB, Mongoose
- **템플릿 엔진**: EJS
- **이메일 발송**: Nodemailer
- **암호화**: bcryptjs
- **기타**: dotenv, express-session, config

## 프로젝트 구조
``` text
express-passport-app/
├── .env                    # 환경 변수 설정 파일
├── config/                 # 설정 파일 디렉토리
│   ├── development.json    # 개발 환경 설정
│   ├── production.json     # 운영 환경 설정
│   └── default.json        # 기본 설정
├── node_modules/           # npm 패키지
├── package.json            # 프로젝트 의존성 및 스크립트
├── public/                 # 정적 파일 (CSS, JS, 이미지 등)
├── src/                    # 소스 코드
│   ├── config/             # 설정 파일
│   │   └── passport.js     # Passport 전략 설정
│   ├── mail/               # 메일 관련 코드
│   │   ├── mail.js         # 메일 발송 기능
│   │   ├── welcome_template.js   # 환영 메일 템플릿
│   │   └── goodbye_template.js   # 탈퇴 메일 템플릿
│   ├── middlewares/        # 미들웨어
│   │   └── auth.js         # 인증 관련 미들웨어
│   ├── models/             # 데이터 모델
│   │   └── users.model.js  # 사용자 모델
│   ├── routes/             # 라우터
│   │   ├── main.router.js  # 메인 라우터
│   │   └── users.router.js # 사용자 라우터
│   ├── views/              # 뷰 템플릿
│   │   ├── index.ejs       # 메인 페이지
│   │   ├── login.ejs       # 로그인 페이지
│   │   └── signup.ejs      # 회원가입 페이지
│   └── server.js           # 서버 진입점
└── .gitignore              # Git 무시 파일 목록
```

## 설치 방법

### 1. 프로젝트 클론 또는 새 프로젝트 생성

```bash
# 새 프로젝트 생성
mkdir express-passport-app
cd express-passport-app
npm init -y
```

### 2. 필요한 패키지 설치

```bash
# 핵심 패키지
npm install express mongoose passport passport-local passport-google-oauth20 passport-kakao

# 인증 및 보안 관련
npm install bcryptjs express-session cookie-parser

# 이메일 발송
npm install nodemailer

# 개발 도구
npm install nodemon dotenv config

# 템플릿 엔진
npm install ejs
```

### 3. 환경 변수 설정 (.env 파일 생성)
``` bash
# Google OAuth 인증 정보
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Kakao OAuth 인증정보
KAKAO_CLIENT_ID=your_kakao_client_id

# 세션 암호화 키
SESSION_SECRET=your_session_secret_key

# MongoDB 연결 정보
MONGODB_URI=your_mongodb_connection_string

# 이메일 비밀번호
EMAIL_PASSWORD=your_email_password
```


### 4. 스크립트 설정 (package.json)

```json
"scripts": {
  "dev": "nodemon src/server.js",
  "start": "node src/server.js"
}
```

## 단계별 구현 가이드

### 1단계: 기본 Express 서버 설정

#### src/server.js 생성

```javascript
const express = require("express");
const path = require("path");
const app = express();
require("dotenv").config();

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/static", express.static(path.join(__dirname, "public")));

// 뷰 엔진 설정
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// 기본 라우트
app.get("/", (req, res) => {
  res.render("index");
});

// 서버 시작
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
```

### 2단계: MongoDB 연결 설정

#### server.js에 추가

```javascript
const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((err) => {
    console.log(err);
  });
```

### 3단계: 사용자 모델 생성

#### src/models/users.model.js 생성

```javascript
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema({
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
    minLength: 5,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  kakaoId: {
    type: String,
    unique: true,
    sparse: true,
  },
});

// 비밀번호 저장 전 해싱
const saltRounds = 10;
userSchema.pre("save", function (next) {
  let user = this;
  if (user.isModified("password")) {
    bcrypt.genSalt(saltRounds, function (err, salt) {
      if (err) return next(err);
      bcrypt.hash(user.password, salt, function (err, hash) {
        if (err) return next(err);
        user.password = hash;
        next();
      });
    });
  } else {
    next();
  }
});

// 비밀번호 비교 메소드
userSchema.methods.comparePassword = function (plainPassword, cb) {
  bcrypt.compare(plainPassword, this.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};

const User = mongoose.model("User", userSchema);
module.exports = User;
```

### 4단계: 인증 미들웨어 생성

#### src/middlewares/auth.js 생성

```javascript
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  next();
}

module.exports = {
  checkAuthenticated,
  checkNotAuthenticated,
};
```

### 5단계: Passport 설정

#### src/config/passport.js 생성

```javascript
const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const KakaoStrategy = require("passport-kakao").Strategy;
const User = require("../models/users.model");

// 세션에 사용자 ID 저장
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// 세션에서 사용자 검색
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// 로컬 전략 설정
const localStrategyConfig = new LocalStrategy(
  { usernameField: "email", passwordField: "password" },
  async (email, password, done) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return done(null, false, { msg: `Email ${email} not found` });
      }
      user.comparePassword(password, (err, isMatch) => {
        if (err) return done(err);
        if (isMatch) return done(null, user);
        return done(null, false, { msg: "Invalid email or password." });
      });
    } catch (err) {
      return done(err);
    }
  }
);
passport.use("local", localStrategyConfig);

// Google 전략 설정
const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleStrategyConfig = new GoogleStrategy(
  {
    clientID: googleClientID,
    clientSecret: googleClientSecret,
    callbackURL: "/auth/google/callback",
    scope: ["email", "profile"],
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const existingUser = await User.findOne({ googleId: profile.id });
      if (existingUser) {
        return done(null, existingUser);
      }
      const user = new User();
      user.email = profile.emails[0].value;
      user.googleId = profile.id;
      await user.save();
      done(null, user);
    } catch (err) {
      console.log(err);
      done(err);
    }
  }
);
passport.use("google", googleStrategyConfig);

// Kakao 전략 설정
const kakaoClientID = process.env.KAKAO_CLIENT_ID;
const kakaoStrategyConfig = new KakaoStrategy(
  {
    clientID: kakaoClientID,
    callbackURL: "/auth/kakao/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const existingUser = await User.findOne({ kakaoId: profile.id });
      if (existingUser) {
        return done(null, existingUser);
      }
      const user = new User();
      user.email = profile._json.kakao_account.email;
      user.kakaoId = profile.id;
      await user.save();
      done(null, user);
    } catch (err) {
      console.log(err);
      done(err);
    }
  }
);
passport.use("kakao", kakaoStrategyConfig);
```

### 6단계: 세션 설정 및 Passport 초기화

#### server.js에 추가

```javascript
const passport = require("passport");
const session = require("express-session");
require("./config/passport");

// 세션 설정
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1시간
  })
);

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());
```

### 7단계: 이메일 기능 구현

#### src/mail/welcome_template.js 생성

```javascript
const welcome = (data) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>반갑습니다</title>
      </head>
      <body>
        <div>감사합니다.</div>
      </body>
    </html>
  `;
};

module.exports = welcome;
```

#### src/mail/goodbye_template.js 생성

```javascript
const goodbye = (data) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>안녕히가세요</title>
      </head>
      <body>
        <div>그동안 감사했습니다.</div>
      </body>
    </html>
  `;
};

module.exports = goodbye;
```

#### src/mail/mail.js 생성

```javascript
const mailer = require("nodemailer");
const welcome = require("./welcome_template");
const goodbye = require("./goodbye_template");
require("dotenv").config();

const getEmailData = (to, name, template) => {
  let data = null;

  switch (template) {
    case "welcome":
      data = {
        from: "보내는 사람 이름<nambawon1@gmail.com>",
        to,
        subject: `Hello ${name}`,
        html: welcome(),
      };
      break;
    case "goodbye":
      data = {
        from: "보내는 사람 이름<nambawon1@gmail.com>",
        to,
        subject: `Goodbye ${name}`,
        html: goodbye(),
      };
      break;
    default:
      data;
      break;
  }
  return data;
};

const sendMail = (to, name, type) => {
  const transporter = mailer.createTransport({
    service: "Gmail",
    auth: {
      user: "nambawon1@gmail.com",
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mail = getEmailData(to, name, type);
  transporter.sendMail(mail, (error, response) => {
    if (error) {
      console.log(error);
    } else {
      console.log("email sent successfully");
    }
    transporter.close();
  });
};

module.exports = sendMail;
```

### 8단계: 라우터 구현

#### src/routes/main.router.js 생성

```javascript
const express = require("express");
const mainRouter = express.Router();
const {
  checkAuthenticated,
  checkNotAuthenticated,
} = require("../middlewares/auth");

mainRouter.get("/", checkAuthenticated, (req, res) => {
  res.render("index");
});

mainRouter.get("/login", checkNotAuthenticated, (req, res) => {
  res.render("login");
});

mainRouter.get("/signup", checkNotAuthenticated, (req, res) => {
  res.render("signup");
});

module.exports = mainRouter;
```

#### src/routes/users.router.js 생성

```javascript
const express = require("express");
const usersRouter = express.Router();
const {
  checkAuthenticated,
  checkNotAuthenticated,
} = require("../middlewares/auth");
const passport = require("passport");
const User = require("../models/users.model");
const sendMail = require("../mail/mail");

// 로그인 라우트
usersRouter.post("/login", (req, res, next) => {
  console.log("로그인 요청");
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("passport.authenticate 에러:", err);
      return next(err);
    }
    if (!user) {
      console.log("로그인 실패:", info);
      return res.status(401).json({ msg: info?.msg || "로그인 실패" });
    }

    req.login(user, (err) => {
      if (err) {
        console.error("req.login 에러:", err);
        return next(err);
      }
      if (!res.headersSent) {
        console.log("로그인 성공 - 리디렉션 처리");
        return res.redirect("/");
      }
    });
  })(req, res, next);
});

// 로그아웃 라우트
usersRouter.post("/logout", (req, res, next) => {
  req.logOut(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});

// 회원가입 라우트
usersRouter.post("/signup", async (req, res) => {
  const user = new User(req.body);
  try {
    await user.save();
    // 환영 이메일 보내기
    sendMail("nambawon1@naver.com", "Park sangmin", "welcome");
    res.redirect("/login");
  } catch (err) {
    console.log(err);
  }
});

// Google OAuth 라우트
usersRouter.get("/google", passport.authenticate("google"));

usersRouter.get(
  "/google/callback",
  passport.authenticate("google", {
    successReturnToOrRedirect: "/",
    failureRedirect: "/login",
  })
);

// Kakao OAuth 라우트
usersRouter.get("/kakao", passport.authenticate("kakao"));

usersRouter.get(
  "/kakao/callback",
  passport.authenticate("kakao", {
    successReturnToOrRedirect: "/",
    failureRedirect: "/login",
  })
);

module.exports = usersRouter;
```

### 9단계: 뷰 템플릿 생성

#### src/views/login.ejs 생성

```html
<section class="prompt">
  <h1>Sign in</h1>
  <form action="/auth/login" method="post">
    <div>
      <label for="email">Email</label>
      <input id="email" name="email" type="text" required />
    </div>
    <div>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" required />
    </div>
    <button type="submit">Sign in</button>
  </form>
  <br />
  <a href="/auth/google"> Sign in with Google </a>
  <br />
  <a href="/auth/kakao"> Sign in with Kakao </a>
  <p>아직 아이디가 없다면<a href="/signup">Sign up</a></p>
</section>
```

#### src/views/signup.ejs 생성

```html
<section class="prompt">
  <h1>Sign up</h1>
  <form action="/auth/signup" method="post">
    <div>
      <label for="email">Email</label>
      <input id="email" name="email" type="text" required />
    </div>
    <div>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" required />
    </div>
    <button type="submit">Sign up</button>
  </form>
  <p>이미 아이디가 있다면<a href="/login">Sign in</a></p>
</section>
```

#### src/views/index.ejs 생성

```html
<h1>Welcome to the Dashboard</h1>
<p>You are logged in!</p>
<form action="/auth/logout" method="post">
  <button type="submit">Logout</button>
</form>
```

### 10단계: 서버 라우터 설정

#### server.js에 추가

```javascript
const mainRouter = require("./routes/main.router");
const usersRouter = require("./routes/users.router");

app.use("/", mainRouter);
app.use("/auth", usersRouter);
```

### 11단계: 포트 설정 (config 패키지 사용)

#### config/default.json 생성

```json
{
  "server": {
    "port": 4000
  }
}
```

#### server.js의 포트 설정 수정

```javascript
const config = require("config");
const serverConfig = config.get("server");
const port = serverConfig.port;

app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
```

## 주요 기능 설명

### 1. 인증 시스템

- **로컬 인증**: 이메일과 비밀번호를 사용한 전통적인 인증 방식
- **Google OAuth**: Google 계정을 사용한 로그인
- **Kakao OAuth**: Kakao 계정을 사용한 로그인
- **세션 관리**: express-session을 사용한 로그인 상태 유지
- **미들웨어**: 인증 상태에 따른 페이지 접근 제어

### 2. 데이터베이스 관리

- **Mongoose 스키마**: 사용자 정보 구조화
- **MongoDB 연결**: 클라우드 MongoDB 서비스 활용
- **비밀번호 해싱**: bcryptjs를 사용한 안전한 비밀번호 저장

### 3. 이메일 서비스

- **템플릿 관리**: 다양한 상황별 이메일 템플릿
- **Nodemailer 통합**: Gmail SMTP를 사용한 이메일 발송
- **자동화**: 회원가입 시 자동 환영 이메일 발송

## 파일 흐름 및 연관 관계

### 서버 시작 흐름

1. `server.js`: 애플리케이션의 시작점
   - 환경 변수 로드 (`dotenv`)
   - Express 앱 설정
   - 미들웨어 설정
   - MongoDB 연결
   - 세션 설정
   - Passport 초기화
   - 라우터 설정

2. `config/passport.js`: Passport 전략 정의
   - 로컬 전략: `passport-local`
   - Google 전략: `passport-google-oauth20`
   - Kakao 전략: `passport-kakao`

### 요청 처리 흐름

1. **클라이언트 요청** -> `server.js` (요청 수신)
2. **라우팅** -> `main.router.js` 또는 `users.router.js` (경로에 따라)
3. **인증 검사** -> `middlewares/auth.js` (필요한 경우)
4. **인증 처리** -> `config/passport.js` (로그인 시)
5. **데이터 처리** -> `models/users.model.js` (DB 작업)
6. **이메일 발송** -> `mail/mail.js` (회원가입 시)
7. **응답 생성** -> `views/*.ejs` (페이지 렌더링)
8. **클라이언트 응답** -> 브라우저에 결과 전송

### 데이터 흐름

1. **회원가입**:
   - 클라이언트 -> 회원가입 양식 제출
   - `users.router.js` -> 사용자 데이터 수신
   - `users.model.js` -> 비밀번호 해싱 및 저장
   - `mail/mail.js` -> 환영 이메일 발송
   - 리다이렉트 -> 로그인 페이지

2. **로그인**:
   - 클라이언트 -> 로그인 양식 제출
   - `users.router.js` -> 사용자 데이터 수신
   - `passport.js` -> 인증 처리
   - 세션 생성 -> 사용자 정보 저장
   - 리다이렉트 -> 메인 페이지

3. **소셜 로그인**:
   - 클라이언트 -> 소셜 로그인 버튼 클릭
   - `users.router.js` -> 소셜 서비스로 리다이렉트
   - 소셜 서비스 -> 승인 후 콜백 URL로 리다이렉트
   - `passport.js` -> 소셜 프로필 처리 및 사용자 생성/조회
   - 세션 생성 -> 사용자 정보 저장
   - 리다이렉트 -> 메인 페이지

## 응용 및 확장 방법

### 기능 확장

1. **추가 OAuth 구현**:
   - Facebook, GitHub 등 다른 소셜 로그인 추가
   - `passport-facebook`, `passport-github` 등의 패키지 설치
   - Passport 전략 추가 및 라우트 설정

2. **이메일 인증**:
   - 회원가입 시 이메일 인증 링크 발송
   - 인증 상태 확인 로직 추가
   - 인증 전/후 기능 제한

3. **프로필 관리**:
   - 사용자 프로필 수정 기능
   - 프로필 사진 업로드 (multer 패키지 활용)
   - 계정 설정 페이지

### 보안 강화

1. **CSRF 보호**:
   - `csurf` 패키지 설치
   - CSRF 토큰 생성 및 확인 로직 추가

2. **레이트 리밋**:
   - `express-rate-limit` 패키지 설치
   - 로그인 시도 제한 설정

3. **HTTPS 설정**:
   - SSL 인증서 적용
   - `helmet` 패키지로 보안 헤더 설정

### UI/UX 개선

1. **반응형 디자인**:
   - Bootstrap, Tailwind CSS 등의 프레임워크 적용
   - 모바일 친화적 인터페이스 구현

2. **사용자 피드백**:
   - 플래시 메시지 구현 (`connect-flash` 패키지)
   - 로딩 상태 표시
   - 에러 메시지 개선

---

이 프로젝트는 Express.js와 Passport.js를 활용한 기본적인 인증 시스템을 구현한 것입니다. 이 코드베이스를 바탕으로 다양한 기능을 추가하고, 실제 프로덕션 환경에 맞게 최적화하여 사용할 수 있습니다.
