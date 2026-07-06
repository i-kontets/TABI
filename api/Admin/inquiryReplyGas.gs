// このスクリプトは、TABI 管理画面から送られたお問い合わせ返信をメール送信するためのものです。
// 外部からの不正送信を防ぐため、PHP 側と共有するトークンを持たせています。
const INQUIRY_REPLY_TOKEN = "tabi-inquiry-reply-2026";

// 管理画面から POST される JSON を受け取り、内容を検証してメール送信まで行います。
function doPost(e) {
  try {
    // 受け取ったリクエスト本文を JSON として読み込みます。
    // 何も届いていない場合でも壊れないよう、空オブジェクトを既定値にしています。
    const data = JSON.parse(e.postData.contents || "{}");

    // トークンが一致しない場合は、管理画面以外からの不正送信として拒否します。
    if (INQUIRY_REPLY_TOKEN && data.token !== INQUIRY_REPLY_TOKEN) {
      return jsonResponse({ ok: false, message: "Invalid token" });
    }

    // 宛先メールアドレスまたは返信本文が不足している場合は送信できないので、ここで止めます。
    if (!data.to || !data.replyBody) {
      return jsonResponse({ ok: false, message: "Missing recipient or reply body" });
    }

    // メール件名を組み立てます。
    // お問い合わせ件名があればそれを優先し、なければ問い合わせ ID を使います。
    const subject = `【TABI】お問い合わせへの返信: ${data.title || data.inquiryId || ""}`;

    // 送信する本文を、ユーザーへの挨拶・返信内容・元のお問い合わせ情報の順で組み立てます。
    // 配列で作ってから join することで、行区切りを見通しよく管理できます。
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

    // GmailApp を使って、宛先・件名・本文を送信します。
    // name を指定することで、受信側には TABI 運営名義で表示されます。
    GmailApp.sendEmail(data.to, subject, body, {
      name: "TABI運営",
    });

    // 送信成功を JSON で返します。
    return jsonResponse({ ok: true });
  } catch (error) {
    // 途中で例外が起きた場合は、エラーメッセージを JSON で返して呼び出し元に伝えます。
    return jsonResponse({ ok: false, message: String(error) });
  }
}

// Apps Script のレスポンスを JSON 形式にそろえるための共通関数です。
function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}