/**
 * 複数の画面から使われる共通の表示部品です。
 *
 * 主な流れ:
 * 1. 必要な部品や API 関数を読み込む
 * 2. 画面表示やデータ取得に必要な値を準備する
 * 3. ユーザー操作や API の結果に合わせて表示を更新する
 *
 * 扱うデータ: React の state、props、フォーム入力、API から返ったデータを主に扱います。
 */
import React, { useEffect, useState } from 'react';
import { reportSystemError } from '../services/systemErrorReporter';

/**
 * isImageAvatar は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
function isImageAvatar(value) {
    return typeof value === 'string' && (/^(https?:)?\/\//.test(value) || value.startsWith('/'));
}

/**
 * UserAvatar は、このファイルの中心となる処理をまとめた関数です。
 * 画面から渡された値や API の結果を使い、次に表示する内容を決めます。
 */
export default function UserAvatar({
    src,
    name = '',
    className,
    fallbackClassName,
    alt = '',
    source = 'Chat user icon',
}) {
    // state は、画面に表示する値や入力途中の値を React に覚えてもらうためのデータです。
    const [failedSrc, setFailedSrc] = useState('');
    const text = String(name || '?').slice(0, 1);
    const canShowImage = isImageAvatar(src) && failedSrc !== src;

    // 画面が表示された直後や監視している値が変わった時に、必要なデータ取得や初期設定を行います。
    useEffect(() => {
        // ここで条件を確認し、状況に合う処理だけを実行します。
        if (src !== failedSrc) {
            setFailedSrc('');
        }
    }, [src, failedSrc]);

    // ここで条件を確認し、状況に合う処理だけを実行します。
    if (!canShowImage) {
        return (
            <div className={fallbackClassName} aria-hidden="true">
                {text || '?'}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => {
                setFailedSrc(src);
                reportSystemError({
                    errorType: 'RESOURCE_ERROR',
                    errorCode: 'S3_USER_ICON_LOAD_FAILED',
                    message: 'S3\u306e\u30e6\u30fc\u30b6\u30fc\u30a2\u30a4\u30b3\u30f3\u3092\u8aad\u307f\u8fbc\u3081\u307e\u305b\u3093\u3067\u3057\u305f',
                    source,
                    requestUrl: src,
                    httpStatus: null,
                });
            }}
        />
    );
}
