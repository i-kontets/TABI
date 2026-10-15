# 管理者認証後の503と限定通知テスト（2026-09-30）

## 結論と実施範囲

管理者1の正規認証・管理API閲覧・作成権限条件は確認済みという状態を引き継ぐ。今回のPOSTはApacheの管理API書き込み停止に該当する。DB不足や管理者認証エラーとして扱わない。

加えて、現在の本番index.htmlは通知修正版と異なる旧フロントを参照している。停止解除だけでは限定テストを実施できない。今回の作業は設定・配備ファイル・RDSの読み取りとブラウザの既存記録確認、ローカルの本記録更新のみ。本番ファイル、DBデータ・構造、AWS、cronは変更せず、POST再送・CLI実行・通常運用再開を行っていない。

## 503の実記録と発生元

| 項目 | 確認結果 |
|---|---|
| URL | `https://genshin.mond.jp/TABI/api/Admin/index.php?resource=notices` |
| メソッド | POST |
| 応答 | 503 Service Unavailable、text/html、2127 bytes、Apache |
| 応答Date | 2026-09-30 02:22:39 GMT＝11:22:39 JST。リクエスト開始時刻そのものは未取得 |
| 根拠 | 既存NetworkのGeneral/Response headersとユーザーの提示内容が一致 |
| Payload | ユーザーが既存Payloadを提示。target=全ユーザー、push=true、startAt/endAtは空文字、requestKey/targetIdなし |

提示された送信済みJSONは以下。再送していない。

```json
{"title":"テスト","body":"通知機能","target":"全ユーザー","startAt":"","endAt":"","push":true}
```

11:26 JSTにSSHで確認した `/TABI/api/.htaccess` の9～10行が発生元となる。

```apache
RewriteCond %{REQUEST_METHOD} !^(GET|HEAD|OPTIONS)$
RewriteRule ^(?:api/)?Admin(?:/|$) - [R=503,L]
```

このルールは重複入口の統一Rewrite（14行）や実ファイル通過判定より前にある。通常 `/TABI/api/Admin/…` と重複 `/TABI/api/api/Admin/…` の書き込みはPHP実行前に503となる。クエリのresource値、本人ID、通知テーブルの状態による分岐ではない。root `/TABI/.htaccess` は実ファイル・ディレクトリ通過とSPA fallbackであり、503指定はない。確認したAdmin配下・重複api配下に追加.htaccessはない。

GET/HEAD/OPTIONSはこの停止条件の対象外。ただし「停止ルールを通る」と「アプリが200を返す」は異なる。11:28 JSTのCookieなしGETは通常・重複経路とも401 JSON（ログインが必要）で、PHP認証まで到達した。管理者1の既存セッションで一覧itemsを取得した先行確認と区別する。Cookieなしの401を管理者1のセッション失効の証拠にしない。

PHPの `api/config/db.php` はDB接続失敗時に503 JSONを返す別経路を持つ。今回のHTML応答と区別する。11:28:43 JSTのstatus.phpは200／AVAILABLE／databaseAvailable=true、同時間帯のRDS SELECTも成功。GETに新たな503が発生した場合は、その時点のDB接続・応答種別を改めて調べる。

既存Networkを再現するためのPOSTは行っていない。調査したホーム・Web/API直下の候補には対応するアクセスログを発見できず、CLIのerror_log設定も空だった。ホスティング管理画面側のログ有無は未確認。PHPSESSIDなどの秘密値は記録・再利用しない。

## 保存結果（RDS SELECT、11:26～11:28 JST）

| 対象 | 結果 |
|---|---|
| admin_notices | 4件、notice_id=1～4のみ。全件request_key=NULL、notification_id=NULL |
| 最も新しい既存お知らせ | notice_id=4、created_at=2026-09-27 22:36:02 UTC。今回のPOST以前の記録 |
| notifications | 1件、notification_id=2。2026-07-23作成のnotification_service_testで、今回のお知らせではない |
| notification_recipients | 上記notification_id=2のuser_id=2だけ。is_read=1、read_at設定済み |
| notification_settings | 1件。今回変更なし |

確認時点では今回の新規お知らせ・対応通知・未読宛先を認めない。503だけで未保存と断定せず、全お知らせID・作成日時・関連ID・request_keyを確認した結果である。失敗要求にはrequestKey自体がなく、キー指定の個別照合はできないため、11:22の要求より後の11:26～11:28に全4件と通知・宛先を確認した。既存notice_id=4を補完・再送せず、既存notification_id=2を今回の成果に含めない。

## フロントの不一致とフォーム

11:27 JST、本番ファイルの読み取りと公開URLのGETで一致して確認した参照先：

- `main-CppXno4J.js`
- `index.esm-BTIZwCTM.js`
- `main-C5VbrvfT.css`

9月28日の修正版配備記録と現在のローカルdistが参照する組は `main-D0SXypcF.js`、`index.esm-hNB43mnu.js`、`main-Dj9O1BrQ.css`。本番トップと深い管理画面URLの両方が旧組を返すため、ブラウザキャッシュだけが原因ではない。本番index.htmlのmtimeは9月14日であるが、コピー時に日時が保持される可能性があるため、それだけで復元時刻や変更者を断定しない。

現在配信中のJSのお知らせフォームを確認した結果：

- 新規stateにtargetIdがなく、対象ID入力欄もない。JS内の別機能にtargetId文字列があることを対応済みの証拠にしない。
- requestKey生成・送信処理がない（配信JS全体のrequestKey出現数0）。有効な入力でも新PHPの登録キー検証に適合しない。
- WebSocketToken.phpの参照がない旧接続処理であり、署名認証を要求する配備済みAWS版との整合が取れていない。
- 旧フォームの「確認する」はタイトル・本文の簡単な確認後に直接登録APIを呼ぶ。プレビューだけのボタンと扱わない。

今回取得できた実画面ではタイトル入力済み・全ユーザー・Push ON。公開開始／終了のAXにはValueがなく、7月の日時はPlaceholderとして表示されている。配信ソースもstartAt/endAt初期値は空文字。後続のユーザーによるPayload提示でもstartAt/endAtは空文字だった。**7月表記はプレースホルダーであり、今回送信された日付値ではない**。送信やフォームの書き換えは行っていない。

再開時は修正版フロントとの一致を先に確認し、特定ユーザー、targetId=2、push=false、実行時点を含むAsia/Tokyoの公開期間を確認する。旧フォームへIDを後付けした手製POSTで代用しない。旧assetは削除しない。配備物の再利用元は認証追加後のstage-auth-v3であり、古いstage-v2ではない。

## 認証と限定テストの判定

| 項目 | 状態・根拠 |
|---|---|
| 管理者1の本人認証 | 確認済み。先行作業でChromeのProfile.phpがuser_id=1 |
| 管理API閲覧 | 確認済み。同セッションで一覧itemsを取得 |
| 作成権限条件 | 確認済み。今回もRDS active・deleted_at=NULL・admin_level=9。コードは5以上を要求 |
| 受信者2の本人認証 | Windows Chromeの同セッションでProfile.phpのuser_id=2とユーザーが確認。Codexによる独立した実画面照合は未実施 |
| 作成POST成功 | 未確認。今回の失敗要求は503であり、作成成功ではない |
| 今回の生成ID | なし。新規通知は確認されず、Codexによる登録も未実施 |
| WebSocket受信／自動表示／未読増加 | 未確認。現在の未読件数の報告も未受領 |
| 既読化／再読み込み後の維持／同じキーでの再送 | 未確認・未実施 |

## 他作業を止められない場合

既存のrequest_keyによる重複防止は、保存する通知と受信者の重複を防ぐための仕組みであり、停止中の1件を許可する機構ではない。既存の.htaccess・管理APIに認証付き限定例外は存在しない。

CLIは `tabi_notice_publisher` のGET_LOCKでCLI同士を排他するが、登録APIの `noticePublishRealtime()` は同じロックを使っていない。COMMIT後からrealtime_published_at更新前の間にCLIが同じお知らせを選ぶと、同じ通知IDのイベントを二度emitする可能性がある。今回の実測障害ではなくコード上の競合可能性。UNIQUE制約によるDB重複防止とは区別する。

したがって既存機構だけで、今すぐ1件だけを開放してAPI由来の即時受信まで分離検証できるとは判定しない。通常運用を全解除したり、重複URLを使って回避したりしない。

並行運用で進めるために必要となる追加設計（**未実装・本番適用不可**）：

1. 通常APIの正式なSession・active・admin_level・同一送信元・JSON確認を維持したサーバー側の期限付き限定ゲート。
2. 管理者1、POST notices、特定ユーザー2、Push OFF、固定した1つのrequestKeyと同一内容、有効な公開期間だけを許可。他の作成・編集・削除は停止を維持。
3. 秘密URLやクライアント指定の管理者IDに依存しない。設定欠落・期限切れ・例外発生では閉じる。設定をWeb公開外に置き、終了時はまずApacheの停止版へ戻してから例外を無効化する。
4. CLIとHTTPで通知IDごとの配信排他を共有し、既存の保存済み通知から無条件に再送しない。配信とDB完了記録の間の障害で起きる再配信は受信側のID単位再取得で吸収する。
5. 正式フォームの送信前確認とrequestKeyとの対応を見える形にし、DB・イベント・一覧・既読をnotification_idで追跡する。同時発生した別通知の未読変動を今回の成果に加算しない。
6. ローカルで通常／重複経路、認証・対象・Push・キー・期限の否定試験と競合試験を行い、差分・影響・復旧手順を揃えてから、新しい本番停止例外の明示承認を得る。

変更候補は `api/.htaccess`、`api/Admin/index.php` と限定ゲート、`api/Admin/services/notices.php` の共通配信部分、必要なフォーム確認部分。DB ALTERや新テーブルは前提としない。現時点でこの新しい停止例外の承認を得たとは扱わない。

既存の排他的手順を使う場合は、修正版フロントと両セッションの準備後、**15分程度を目安とする検証時間**に他管理者の管理API書き込みと公開CLIの起動を止め、既存実行の終了を確認する必要がある。時間は見積もりで保証ではない。ユーザー向け閲覧・通常サイト全体の停止は不要。CLI停止・cron操作はユーザー担当であり、現在は停止不能という回答を維持する。この時間が確保されたとは扱わない。

## 残作業と復旧

- 既存失敗要求のPayload確認は完了。新しいキーで再送せず、上記の全件・時刻照合結果を引き継ぐ。
- 修正版フロントとの不一致を解消し、実際の管理・受信画面で配信版と認証付きSocket接続を確認する。
- 排他的な検証時間、または上記追加機構の実装・検証・本番承認を揃える。
- 受信者の現在の未読件数を確認し、限定1件作成後は再読み込み前に自動更新を観測する。その後に既読化・再読み込み・同一キー再送・切断復帰を確認する。
- 今回は本番変更がないため復旧操作はなし。通常／重複Adminの書き込み停止は保持。DB追加4列・既存データ・AWS認可修正版は削除・巻き戻ししていない。

停止30分前通知はコード検証済み／自動運用未確認。FCM/Web Pushは別工程。本番即時通知の基本機能は未完成であり、DB変更済みという事実と区別する。
