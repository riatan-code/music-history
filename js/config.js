/* ローカル設定。
   youtubeApiKey を入れると、動画IDが登録されていない曲も YouTube Data API で検索して
   サイト内で再生します(結果はブラウザに保存され、同じ曲は2回目以降検索しません)。
   空のままなら、IDのない曲は YouTube の検索結果を新しいタブで開きます。
   キーの取得: Google Cloud Console → 「YouTube Data API v3」を有効化 → 認証情報 → APIキー
   ※ このファイルを公開リポジトリに含めないでください。 */
window.MH_CONFIG = {
  youtubeApiKey: ""
};
