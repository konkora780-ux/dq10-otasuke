// ===== 公開設定（ここだけ書き換えればOK） =====
// 手順書「帰宅後にやること」を見ながら値を入れてください。空のままでもアプリは動きます。
const CONFIG = {
  // GoatCounter（アクセス数）。https://○○.goatcounter.com の「○○」の部分
  goatcounterCode: "",

  // Googleフォーム（評価・コメント・誤り報告）
  // formAction: フォームの送信先。"https://docs.google.com/forms/d/e/〇〇/formResponse" の形
  formAction: "",
  // 各質問の entry 番号（例 "entry.123456789"）
  formFields: { kind: "", rating: "", page: "", comment: "" },

  // 作者名（フッターに表示）
  author: "こんちゃん"
};
