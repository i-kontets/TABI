-- TABI FAQ initial data.
-- 対象画面: /TABI/mypage/faq
-- 保存先: system_settings.setting_key = 'faq_items'
-- 既存のFAQがある場合は残し、同じ question の新規FAQは追加しません。

START TRANSACTION;

CREATE TEMPORARY TABLE _faq_seed_items (
  seed_order INT NOT NULL PRIMARY KEY,
  category VARCHAR(20) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO _faq_seed_items (seed_order, category, question, answer) VALUES
  (1, 'アカウント', 'アカウントを作成するにはどうすればよいですか？', '新規登録画面で名前、メールアドレス、パスワードなど必要な情報を入力して登録します。登録後はログイン画面からTABIを利用できます。'),
  (2, 'アカウント', 'ログインできないときは何を確認すればよいですか？', 'メールアドレスとパスワードに入力間違いがないか確認してください。解決しない場合は、パスワード再設定や問い合わせからご連絡ください。'),
  (3, 'アカウント', 'パスワードを忘れた場合はどうすればよいですか？', 'ログイン画面のパスワード再設定から、登録済みメールアドレスへ再設定用の案内を送信してください。案内に従って新しいパスワードを設定できます。'),
  (4, 'アカウント', 'メールアドレスは変更できますか？', 'マイページのメールアドレス変更画面から変更できます。確認コードを使って本人確認を行うため、受信できるメールアドレスを入力してください。'),
  (5, 'アカウント', 'プロフィール画像や表示名は変更できますか？', 'マイページのプロフィール編集から変更できます。画像を変更する場合は、対応形式とファイルサイズを確認してアップロードしてください。'),
  (6, 'アカウント', 'アカウントを削除したい場合はどうすればよいですか？', 'アカウント削除を希望する場合は、問い合わせ画面からご連絡ください。本人確認後、必要な手続きについて案内します。'),
  (7, 'アカウント', '公開プロフィールには何が表示されますか？', '表示名、プロフィール画像、自己紹介など、TABI内で共有される情報が表示されます。個人情報を含む内容は入力しないようご注意ください。'),
  (8, 'グループ', '旅行グループはどうやって作成しますか？', 'ホーム画面のグループ作成から、グループ名や説明を入力して作成します。作成したユーザーはグループ管理者として登録されます。'),
  (9, 'グループ', 'メンバーを旅行グループへ招待できますか？', 'グループ画面の招待機能からメンバーを招待できます。招待を受けた人は案内に従って参加してください。'),
  (10, 'グループ', '招待リンクを開いても参加できない場合は？', 'ログイン状態、招待の有効期限、すでに参加済みかどうかを確認してください。うまくいかない場合は、招待を送ったメンバーに再発行を依頼してください。'),
  (11, 'グループ', 'グループ画像や説明は変更できますか？', 'グループの編集画面から変更できます。画像を更新しても反映に時間がかかる場合は、画面を再読み込みしてください。'),
  (12, 'グループ', '旅行先や宿泊先の候補はどうやって追加しますか？', '旅行グループ内の候補追加画面から、観光地、宿泊先、飲食店などの候補を登録できます。登録後はメンバーが確認できます。'),
  (13, 'グループ', '候補への投票はできますか？', 'グループ内の候補一覧や投票画面から、行きたい候補へ投票できます。投票結果を参考に旅行計画を決められます。'),
  (14, 'グループ', 'グループ内でメッセージを送れますか？', 'グループのチャット画面からメンバーへメッセージを送れます。旅行計画の相談や確認事項の共有に利用してください。'),
  (15, 'グループ', 'グループから抜けたい場合はどうすればよいですか？', 'グループからの退出や削除が必要な場合は、グループ管理者に相談してください。操作できない場合は問い合わせ画面から状況をお知らせください。'),
  (16, '通知', '通知を受け取るには何が必要ですか？', '通知画面で通知を許可し、ブラウザや端末側でも通知が許可されていることを確認してください。ログイン状態で利用すると通知を受け取りやすくなります。'),
  (17, '通知', '通知を許可したのに届かない場合は？', '端末やブラウザの通知設定、通信状況、ログイン状態を確認してください。通知を一度オフにしてから再度オンにすると改善する場合があります。'),
  (18, '通知', '通知の種類は変更できますか？', 'マイページの通知設定から、受け取りたい通知の種類を変更できます。設定を変更した後は、保存されていることを確認してください。'),
  (19, '通知', 'メール通知は届きますか？', 'メールアドレス変更など一部の重要な操作では、確認や完了通知のメールが送信される場合があります。迷惑メールフォルダも確認してください。'),
  (20, '通知', 'チャットやグループ更新の通知はいつ届きますか？', 'メンバーの投稿やグループに関する重要な更新があったときに通知される場合があります。通知の届き方は端末やブラウザの状態によって変わります。'),
  (21, '通知', 'メンテナンス中も通知は届きますか？', 'メンテナンス中やデータベース停止中は、通知や画面更新が遅れることがあります。時間をおいてから再度確認してください。'),
  (22, 'その他', 'TABIを利用する推奨環境はありますか？', '最新版のChrome、Edge、Safariなど主要ブラウザでの利用をおすすめします。古いブラウザでは一部機能が正しく動作しない場合があります。'),
  (23, 'その他', '写真をアップロードできない場合は？', '画像形式、ファイルサイズ、通信状況を確認してください。サイズが大きすぎる場合は、画像を圧縮してから再度アップロードしてください。'),
  (24, 'その他', '観光スポットのお気に入りはどこで使えますか？', '観光スポット画面で気になる場所をお気に入り登録できます。旅行先の候補を考えるときのメモとして活用してください。'),
  (25, 'その他', '精算機能では何ができますか？', '旅行中に立て替えた金額や回収したい金額を整理できます。メンバー間の支払い確認に役立ててください。'),
  (26, 'その他', '問い合わせはどこから送れますか？', 'マイページの問い合わせ画面から送信できます。内容、発生した画面、操作手順をできるだけ具体的に入力してください。'),
  (27, 'その他', '不適切な投稿や迷惑行為を見つけた場合は？', '対象の投稿やユーザー情報を確認し、通報または問い合わせからご連絡ください。安全に利用できるよう内容を確認します。'),
  (28, 'その他', 'メンテナンス表示が出た場合はどうすればよいですか？', 'メンテナンス中は一部機能を利用できません。表示されている案内を確認し、しばらく時間をおいてから再度アクセスしてください。'),
  (29, 'その他', '画面の情報が最新に見えない場合は？', 'ページを再読み込みするか、いったん別の画面へ移動して戻ってください。通信状況によって反映に時間がかかることがあります。'),
  (30, 'その他', '個人情報を入力するときの注意点はありますか？', 'チャット、プロフィール、問い合わせには、公開したくない住所、電話番号、認証コード、パスワードなどを入力しないでください。');

SET @existing_faq_items := (
  SELECT setting_value
  FROM system_settings
  WHERE setting_key = 'faq_items'
  LIMIT 1
);

SET @existing_faq_items := CASE
  WHEN @existing_faq_items IS NOT NULL AND JSON_VALID(@existing_faq_items) THEN @existing_faq_items
  ELSE '[]'
END;

INSERT INTO system_settings (setting_key, setting_value, updated_at)
SELECT
  'faq_items',
  COALESCE(
    JSON_ARRAYAGG(
      JSON_OBJECT(
        'category', merged.category,
        'question', merged.question,
        'answer', merged.answer
      )
    ),
    JSON_ARRAY()
  ),
  NOW()
FROM (
  SELECT category, question, answer
  FROM (
    SELECT
      combined.category,
      combined.question,
      combined.answer,
      ROW_NUMBER() OVER (
        PARTITION BY combined.question
        ORDER BY combined.source_order, combined.sort_order
      ) AS duplicate_rank,
      combined.source_order,
      combined.sort_order
    FROM (
      SELECT
        0 AS source_order,
        existing_items.sort_order,
        existing_items.category,
        existing_items.question,
        existing_items.answer
      FROM JSON_TABLE(
        @existing_faq_items,
        '$[*]' COLUMNS (
          sort_order FOR ORDINALITY,
          category VARCHAR(20) PATH '$.category',
          question TEXT PATH '$.question',
          answer TEXT PATH '$.answer'
        )
      ) AS existing_items
      WHERE existing_items.question IS NOT NULL AND existing_items.question <> ''

      UNION ALL

      SELECT
        1 AS source_order,
        seed_order AS sort_order,
        category,
        question,
        answer
      FROM _faq_seed_items
    ) AS combined
  ) AS ranked
  WHERE duplicate_rank = 1
  ORDER BY source_order, sort_order
) AS merged
ON DUPLICATE KEY UPDATE
  setting_value = VALUES(setting_value),
  updated_at = VALUES(updated_at);

DROP TEMPORARY TABLE _faq_seed_items;

COMMIT;
