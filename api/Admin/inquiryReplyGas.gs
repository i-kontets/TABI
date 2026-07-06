const INQUIRY_REPLY_TOKEN = "tabi-inquiry-reply-2026";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || "{}");

    if (INQUIRY_REPLY_TOKEN && data.token !== INQUIRY_REPLY_TOKEN) {
      return jsonResponse({ ok: false, message: "Invalid token" });
    }

    if (!data.to || !data.replyBody) {
      return jsonResponse({ ok: false, message: "Missing recipient or reply body" });
    }

    const subject = `【TABI】お問い合わせへの返信: ${data.title || data.inquiryId || ""}`;
    const body = [
      `${data.userName || "ユーザー"} 様`,
      "",
      "TABI運営です。お問い合わせいただいた内容について返信いたします。",
      "",
      data.replyBody,
      "",
      "---- お問い合わせ内容 ----",
      `お問い合わせID: ${data.inquiryId || ""}`,
      `カテゴリ: ${data.category || ""}`,
      data.originalBody || "",
      "",
      "--------------------------",
      "TABI運営",
    ].join("\n");

    GmailApp.sendEmail(data.to, subject, body, {
      name: "TABI運営",
    });

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, message: String(error) });
  }
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}