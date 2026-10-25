// ===== 公開設定（ここだけ書き換えればOK） =====
// 手順書「帰宅後にやること」を見ながら値を入れてください。空のままでもアプリは動きます。
const CONFIG = {
  // GoatCounter（アクセス数）。https://○○.goatcounter.com の「○○」の部分
  goatcounterCode: "dq10otasuke",

  // Googleフォーム（評価・コメント・誤り報告）
  // formAction: フォームの送信先。"https://docs.google.com/forms/d/e/〇〇/formResponse" の形
  formAction: "https://docs.google.com/forms/d/e/1FAIpQLScVQEOsXlucZLju3eClf3KYMcxcCLs_0sD1IuDRbOMWGmvJOQ/formResponse",
  // 各質問の entry 番号（例 "entry.123456789"）
  formFields: { kind: "entry.1225649718", rating: "entry.835284504", page: "entry.1014788301", comment: "entry.784667431" },

  // 作者名（フッターに表示）
  author: "こんちゃん"
};
