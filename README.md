# 音の系譜

公開ページ: https://riatan-code.github.io/music-history/

ポピュラー音楽のジャンルの系譜を、時代とレーンの地図でたどる静的サイト。

```
node server.js
```

→ http://localhost:5173 (YouTube の埋め込みは `file://` では再生できないため、ローカルサーバー経由で開く)

## 構成

| ファイル | 内容 |
| --- | --- |
| `js/data.js` | レーン・目次(CHAPTERS)・ジャンル・アーティスト・曲のデータ。追加はここだけ |
| `js/app.js` | 系譜図、チューナー、パネル、目次、お気に入り、プレイヤー、検索(レコード棚は非表示) |
| `css/style.css` | スタイル(ライトモード) |
| `js/worldmap.js` | 発祥地マップ用の陸地ドット(world-atlas から生成) |
| `js/config.js` | YouTube Data API キー(任意・公開しないこと) |

### データの追加

- ジャンル: `GENRES` に `{ id, ja, en, y, era, lane, parents: [...], tags, desc }`。`parents` に派生元の id を入れると系譜図の線が引かれる。図上の名前が長いときは `short` で短い名前を付けられる。名前同士が重なる場合は、レーン内の上下に自動で振り分けられる
- 目次: `CHAPTERS` の各面(Side)の `genres` に並べた順が、目次の曲順とジャンルパネルの「前へ/次へ」の順になる
- 発祥地: `ORIGINS` に `ジャンルid: [[緯度, 経度, "地名"], ...]`。先頭が主な発祥地で、派生元ジャンルの発祥地から点線が引かれる
- アーティスト: `ARTISTS` に `{ id, name, ja, g, life, from, bio, tracks: [{ t, y, yt }] }`。`yt` は YouTube の動画 ID。省略すると YouTube 検索を開く

## ショートカット

`/` または `Ctrl+K` 検索 · `Space` 再生/一時停止 · `Esc` 戻る/閉じる · `#g/jazz` `#a/miles` `#toc` `#fav` で直接リンク

## サイト内で全曲を再生する

`js/config.js` の `youtubeApiKey` に YouTube Data API v3 のキーを入れると、動画IDのない曲も検索してサイト内で再生する。検索結果はブラウザに保存されるので、同じ曲の検索は1回だけ(無料枠は1日あたり約100回の検索)。
