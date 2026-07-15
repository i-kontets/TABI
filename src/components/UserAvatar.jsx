import React, { useEffect, useState } from 'react';
import { reportSystemError } from '../services/systemErrorReporter';

function isImageAvatar(value) {
    return typeof value === 'string' && (/^(https?:)?\/\//.test(value) || value.startsWith('/'));
}

export default function UserAvatar({
    src,
    name = '',
    className,
    fallbackClassName,
    alt = '',
    source = 'Chat user icon',
}) {
    const [failedSrc, setFailedSrc] = useState('');
    const text = String(name || '?').slice(0, 1);
    const canShowImage = isImageAvatar(src) && failedSrc !== src;

    useEffect(() => {
        if (src !== failedSrc) {
            setFailedSrc('');
        }
    }, [src, failedSrc]);

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
