import firebaseMessagingServiceWorkerUrl
  from './firebase-messaging-sw.js?worker&url';

async function registerFirebaseServiceWorker() {
  // Service Workerはブラウザ専用の機能なので、ブラウザ以外では何もしません。
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    // 未対応ブラウザは異常ではないため、画面を止めずにnullで呼び出し元へ伝えます。
    return null;
  }

  if (import.meta.env.DEV) {
    // npm run devではWorkerのURLと/TABI/スコープが本番とずれる可能性があります。
    // そのため登録確認は、本番ビルド後のnpm run previewで行う設計にします。
    return null;
  }

  try {
    // TABIは/TABI/配下で公開するため、Service WorkerのスコープもBASE_URLに合わせます。
    return await navigator.serviceWorker.register(
      firebaseMessagingServiceWorkerUrl,
      {
        scope: import.meta.env.BASE_URL,
      }
    );
  } catch {
    // 登録に失敗しても通知以外の画面まで止めないように、nullを返します。
    return null;
  }
}

export { registerFirebaseServiceWorker };