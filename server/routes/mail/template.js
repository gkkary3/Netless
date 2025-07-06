// Netless 이메일 인증번호 안내 템플릿 함수
function verificationTemplate(code) {
  return `
    <div style="font-family:sans-serif; max-width:400px; margin:0 auto; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 2px 8px #e5e7eb; padding:32px 24px; background:#fff;">
      <div style="text-align:center; margin-bottom:24px;">
        <span style="display:inline-block; font-size:2rem; font-weight:800; color:#2563eb; letter-spacing:2px;">Netless</span>
      </div>
      <h2 style="color:#222; font-size:1.3rem; margin-bottom:12px; text-align:center;">이메일 인증번호 안내</h2>
      <p style="color:#444; font-size:1rem; text-align:center; margin-bottom:20px;">Netless 회원가입을 위한 인증번호입니다.<br>아래 인증번호를 입력해 주세요.</p>
      <div style="text-align:center; margin:24px 0;">
        <span style="display:inline-block; font-size:2.2rem; font-weight:700; color:#2563eb; letter-spacing:6px; background:#f1f5f9; padding:12px 32px; border-radius:8px; border:1px dashed #2563eb;">${code}</span>
      </div>
      <p style="color:#666; font-size:0.95rem; text-align:center; margin-bottom:0;">Netless는 안전하고 신뢰할 수 있는 SNS 서비스입니다.<br>본 인증번호는 5분간만 유효합니다.</p>
      <div style="margin-top:32px; text-align:center; color:#94a3b8; font-size:0.85rem;">&copy; ${new Date().getFullYear()} Netless. All rights reserved.</div>
    </div>
  `;
}

module.exports = {
  verificationTemplate,
};
