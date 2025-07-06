const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const userSchema = mongoose.Schema(
  {
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
    username: {
      type: String,
      required: true,
      trim: true,
    },
    profileImage: {
      type: String,
      default: null, // 기본 프로필 이미지 없음
    },
    introduction: {
      type: String,
      default: "", // 기본 소개글 없음
    },
    contact: {
      type: String,
      default: "데이터 없음",
    },
    workspace: {
      type: String,
      default: "데이터 없음",
    },
    friends: { type: [String], default: [] },
    friendsRequests: { type: [String], default: [] },
    // 온라인 상태 관리
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    // 대화 관련 필드 추가
    conversations: [
      {
        with: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        lastMessage: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Message",
        },
        unreadCount: {
          type: Number,
          default: 0,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // 알림 설정
    notificationSettings: {
      messageNotifications: {
        type: Boolean,
        default: true,
      },
      messagePreview: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true }
);

const saltRounds = 10;
userSchema.pre("save", function (next) {
  let user = this;
  //비밀 번호가 변경될 떄만
  if (user.isModified("password")) {
    // salt를 생성
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

userSchema.methods.comparePassword = function (plainPassword, cb) {
  // bcrypt compare 비교
  // plain password => client, this.password => DB password
  bcrypt.compare(plainPassword, this.password, function (err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};
const User = mongoose.model("User", userSchema);

module.exports = User;
