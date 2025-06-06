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
const MongoStore = require("connect-mongo");
const http = require("http"); // 추가: http 서버 생성을 위한 모듈
const { Server } = require("socket.io"); // 추가: socket.io 서버

const config = require("config");
const mainRouter = require("./routes/main.router");
const usersRouter = require("./routes/users.router");
const postsRouter = require("./routes/posts.router");
const commentsRouter = require("./routes/comments.router");
const friendsRouter = require("./routes/friends.router");
const likesRouter = require("./routes/likes.router");
const profileRouter = require("./routes/profile.router");
const messagesRouter = require("./routes/messages.router"); // 추가: 메시지 라우터

const serverConfig = config.get("server");
const port = process.env.PORT || serverConfig.port;
require("dotenv").config();
require("./config/passport");

const cookieEncryptionKey = process.env.SESSION_SECRET;
// Proxy 설정 추가
app.set("trust proxy", 1);
// 미들웨어 설정
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://netless.vercel.app",
      "https://kkary.com",
      "https://www.kkary.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["set-cookie"], // 클라이언트에게 쿠키 헤더 노출
  })
);

const sessionMiddleware = session({
  secret: cookieEncryptionKey,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "sessions",
  }),
  cookie: {
    maxAge: 1000 * 60 * 60, // 1시간
    // 개발 환경
    sameSite: "lax", // 크로스 사이트 쿠키 허용
    secure: false, // HTTPS에서만 쿠키 전송

    // 배포 환경
    // sameSite: "none", // 크로스 사이트 쿠키 허용
    // secure: true, // HTTPS에서만 쿠키 전송
    httpOnly: true, // JavaScript에서 쿠키 접근 방지
  },
});

app.use(sessionMiddleware);

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
app.use("/messages", messagesRouter); // 추가: 메시지 API 라우터

app.get("/api/auth-status", (req, res) => {
  res.json({
    isAuthenticated: req.isAuthenticated(),
    user: req.user || null,
    session: req.session,
  });
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message || "Internal Server Error");
});

// HTTP 서버 생성
const server = http.createServer(app);

// Socket.io 설정
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://netless.vercel.app",
      "https://kkary.com",
      "https://www.kkary.com",
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 세션 미들웨어를 소켓에 연결
const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);
io.use(wrap(sessionMiddleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));

// 인증된 사용자만 소켓 연결 허용
io.use((socket, next) => {
  if (socket.request.user) {
    next();
  } else {
    next(new Error("인증되지 않음"));
  }
});

// 사용자 ID별 소켓 연결 저장
const userSockets = new Map();

// Socket.io 연결 처리
io.on("connection", (socket) => {
  const userId = socket.request.user._id.toString();
  console.log(`사용자 ${userId} 연결됨`);

  // 사용자 ID를 소켓 ID에 매핑
  userSockets.set(userId, socket.id);

  // 연결 해제 처리
  socket.on("disconnect", () => {
    console.log(`사용자 ${userId} 연결 해제됨`);
    userSockets.delete(userId);
  });

  // 새 메시지 수신 및 전달
  socket.on("send_message", async (data) => {
    try {
      const { receiverId, content, conversationId } = data;
      const senderId = userId;

      const Message = require("./models/message.model");

      // 새 메시지 생성 및 저장
      const newMessage = new Message({
        sender: senderId,
        receiver: receiverId,
        content,
        conversationId,
      });

      await newMessage.save();

      // 저장된 메시지를 사용자 정보와 함께 조회
      const populatedMessage = await Message.findById(newMessage._id)
        .populate("sender", "username profileImage")
        .populate("receiver", "username profileImage");

      // 발신자에게 메시지 확인 전송
      socket.emit("message_sent", populatedMessage);

      // 수신자가 온라인이면 메시지 전달
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("receive_message", populatedMessage);
      }
    } catch (error) {
      console.error("메시지 전송 오류:", error);
      socket.emit("message_error", {
        error: "메시지 전송 중 오류가 발생했습니다",
      });
    }
  });

  // 메시지 읽음 표시 처리
  socket.on("mark_as_read", async (data) => {
    try {
      const { messageId } = data;

      const Message = require("./models/message.model");

      // 메시지를 읽음으로 표시
      const message = await Message.findByIdAndUpdate(
        messageId,
        { read: true },
        { new: true }
      );

      if (!message) return;

      const senderId = message.sender.toString();

      // 발신자가 온라인이면 읽음 상태 업데이트 전송
      const senderSocketId = userSockets.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("message_read", { messageId });
      }
    } catch (error) {
      console.error("메시지 읽음 표시 오류:", error);
    }
  });

  // 대화 읽음 표시 처리
  socket.on("mark_conversation_as_read", async (data) => {
    try {
      const { conversationId, senderId } = data;
      const receiverId = userId;

      const Message = require("./models/message.model");

      // 대화의 모든 메시지를 읽음으로 표시
      await Message.updateMany(
        {
          conversationId,
          sender: senderId,
          receiver: receiverId,
          read: false,
        },
        { read: true }
      );

      // 발신자가 온라인이면 읽음 상태 업데이트 전송
      const senderSocketId = userSockets.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit("conversation_read", {
          conversationId,
          readBy: receiverId,
        });
      }
    } catch (error) {
      console.error("대화 읽음 표시 오류:", error);
    }
  });
});

// app.listen 대신 server.listen 사용
server.listen(port, () => {
  console.log(`Listening on ${port}`);
});
