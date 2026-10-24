# DQ10お助け帳（非公式ファンツール）

ドラゴンクエストXオンラインのコインボス・高難度コンテンツ・レベル上げ・仲間モンスターの
必要耐性や編成を、検索してチェックできるWebアプリです。広告なし・無料。

公開ページ: https://konkora780-ux.github.io/dq10-otasuke/

## ファイル構成
- `index.html` … 画面の骨組み
- `css/style.css` … 見た目
- `js/config.js` … **公開設定**（GoatCounter・Googleフォームの値を書く場所）
- `js/data.js` … コインボス・高難度・レベル上げ・仲間モンスターのデータ
- `js/data2.js` … 仲間の特化型・日課週課・カレンダー・用語・宝珠・金策のデータ
- `js/app.js` … 動き（検索・チェック・保存など）
- `sw.js`, `manifest.webmanifest`, `icons/` … オフライン対応とホーム画面アイコン

## データの直し方
1. `js/data.js` か `js/data2.js` の該当する行を書き換える
2. 一番上の `DATA_UPDATED`（data.js）やカレンダーの `CAL_UPDATED`（data2.js）の日付も更新する
3. `sw.js` の `VERSION` を新しい文字に変える（スマホに古い版が残らないように）

古い情報には `era: "実装当時"` を付けると、画面で「要確認」と表示されます。

## 権利表記
(C) ARMOR PROJECT/BIRD STUDIO/SQUARE ENIX All Rights Reserved.
本アプリは個人による非公式ファンツールで、株式会社スクウェア・エニックスおよび関係各社とは関係ありません。
