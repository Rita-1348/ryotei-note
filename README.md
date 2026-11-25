# 旅程ノート

個人用の旅行プランナー(React + TypeScript + Vite)。データはブラウザの localStorage に保存されます。

## 起動

```powershell
cd ryotei-note
npm install      # 初回のみ
npm run dev      # http://localhost:5173
```

- スマホから試す: PCとスマホを同じWi-Fiにつなぎ、`npm run dev` の表示にある `Network:` のURL(例 `http://192.168.x.x:5173`)をスマホで開く。開けない場合はWindowsファイアウォールで Node.js の「プライベート ネットワーク」を許可する。
- 本番ビルド: `npm run build`(`dist/` に出力)、確認は `npm run preview`
- テスト: `npm test`

## 旅行をPCからスマホへ移す

1. PCの一覧で「書き出す」→ JSONファイルが保存される
2. そのファイルをスマホへ送る(AirDrop/メール/クラウドなど)
3. スマホで「旅行ファイルを読み込む」→ ファイルを選ぶ
4. 読み込むたびに新しい旅行として追加される(同名なら「（コピー）」付き)。以後の変更は自動同期されない。

## 注意

- localStorage はブラウザ・URL(オリジン)ごとに別。PCの `localhost:5173` とスマホの `192.168.x.x:5173` は別の保存領域。
- ブラウザのサイトデータを消すと旅行も消える。大事な旅行は「書き出す」でバックアップする。

## スマホをアプリのように使う(ホーム画面に追加)

- 開発サーバー(`npm run dev`)のURLでも、ブラウザの「ホーム画面に追加」で全画面のアイコン起動にできます(Androidは Chrome のメニュー、iPhone は Safari の共有ボタン)。
- オフラインでも開けるようにする(Service Worker)には HTTPS が必要です。`dist/` を HTTPS の静的ホスティングに置いたときだけ有効になります(PCのLAN内 `http://` では無効)。
