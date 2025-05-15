const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    // conversationId는 두 사용자 ID를 정렬하여 결합한 문자열로,
    // 같은 대화에 속한 메시지를 쉽게 찾을 수 있게 함
    conversationId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// 두 사용자 간의 대화를 저장할 때 일관된 conversationId를 생성하는 정적 메서드
messageSchema.statics.createConversationId = function (userId1, userId2) {
  // 두 ID를 알파벳 순으로 정렬하여 일관된 ID를 보장
  return [userId1, userId2].sort().join("_");
};

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;
