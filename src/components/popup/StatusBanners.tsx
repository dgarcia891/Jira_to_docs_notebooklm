import React from 'react';

interface StatusBannersProps {
    status: { text: string; type: 'info' | 'success' | 'error' | 'debug' } | null;
    getStatusBackgroundColor: (type: 'info' | 'success' | 'error' | 'debug') => string;
    getStatusColor: (type: 'info' | 'success' | 'error' | 'debug') => string;
    onClose: () => void;
}

export function StatusBanners({
    status,
    getStatusBackgroundColor,
    getStatusColor,
    onClose
}: StatusBannersProps) {
    if (!status) return null;

    return (
        <div
            title={status.text}
            style={{
                padding: '10px 12px',
                background: getStatusBackgroundColor(status.type),
                color: getStatusColor(status.type),
                borderRadius: '6px',
                fontSize: '13px',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                borderLeft: `4px solid ${getStatusColor(status.type)}`,
                position: 'relative'
            }}
        >
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {status.type === 'error' && '❌ '}
                {status.type === 'success' && '✅ '}
                {status.text}
            </span>
            <button
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 'bold', padding: '0 0 0 10px', fontSize: '14px' }}
            >
                ×
            </button>
        </div>
    );
}
