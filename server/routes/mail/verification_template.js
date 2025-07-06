// 이메일 인증번호 안내 템플릿 함수
function verificationTemplate(code) {
  return `
    <div style='font-family:sans-serif;'>
      <h2>이메일 인증번호 안내</h2>
      <p>아래 인증번호를 입력해 주세요.</p>
      <h1 style='color:#2563eb;'>${code}</h1>
      <p>감사합니다.</p>
    </div>
  `;
}

module.exports = {
  verificationTemplate,
};
