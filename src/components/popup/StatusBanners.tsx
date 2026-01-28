import React from 'react';

interface StatusBannersProps {
    status: { text: string; type: 'info' | 'success' | 'error' | 'debug' } | null;
    onClose: () => void;
}

export function StatusBanners({
    status,
    onClose
}: StatusBannersProps) {
    if (!status) return null;

    const bannerClass = `status-banner banner-${status.type === 'debug' ? 'info' : status.type}`;

    return (
        <div
            className={bannerClass}
            title={status.text}
        >
            <span style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: '500'
            }}>
                {status.type === 'error' && '❌ '}
                {status.type === 'success' && '✅ '}
                {status.text}
            </span>
            <button
                onClick={onClose}
                className="icon-btn"
                style={{ color: 'inherit', padding: '0 0 0 10px', fontSize: '18px' }}
            >
                ×
            </button>
        </div>
    );
}
