const express = require("express");
const { default: mongoose } = require("mongoose");
const app = express();
const path = require("path");
const cors = require("cors");
const flash = require("connect-flash");
const methodOverride = require("method-override");
const User = require("./models/users.model");
const passport = require("passport");
// const cookieSession = require("cookie-session");
const session = require("express-session");

const config = require("config");
const mainRouter = require("./routes/main.router");
const usersRouter = require("./routes/users.router");
const postsRouter = require("./routes/posts.router");
const commentsRouter = require("./routes/comments.router");
const friendsRouter = require("./routes/friends.router");
const likesRouter = require("./routes/likes.router");
const profileRouter = require("./routes/profile.router");

const serverConfig = config.get("server");
const port = process.env.PORT || serverConfig.port;
require("dotenv").config();
require("./config/passport");

const cookieEncryptionKey = process.env.SESSION_SECRET;

// 미들웨어 설정
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ], // 클라이언트 도메인 명시적 허용
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // 모든 HTTP 메서드 허용
    credentials: true, // 인증 허용
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(
  session({
    secret: cookieEncryptionKey,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1시간
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); //form 태그 안 value 값 파싱 작업
app.use(flash());
app.use(methodOverride("_method"));

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// mongoose.set('strictQuery', false);
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("mongoDB connected");
  })
  .catch((err) => {
    console.log(err);
  });

app.use(express.static(path.join(__dirname, "public")));

app.get("/send", (req, res) => {
  req.flash("post success", "포스트가 성공적으로 등록되었습니다!");
  res.redirect("/receive");
});
app.get("/receive", (req, res) => {
  res.send(req.flash("post success")[0]);
});

app.use((req, res, next) => {
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  res.locals.currentUser = req.user;
  next();
});
app.use("/", mainRouter);
app.use("/auth", usersRouter);
app.use("/posts", postsRouter);
app.use("/posts/:id/comments", commentsRouter); // Nested route for comments
app.use("/posts/:id/like", likesRouter);
app.use("/profile/:id", profileRouter);
app.use("/friends", friendsRouter);

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message || "Internal Server Error");
});
app.listen(port, () => {
  console.log(`Listening on ${port}`);
});
