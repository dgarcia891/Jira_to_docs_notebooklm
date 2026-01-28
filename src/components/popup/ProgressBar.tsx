import React from 'react';

interface ProgressBarProps {
    progress: number;
    status: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status }) => {
    return (
        <div style={{ marginBottom: '20px' }} className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span className="label" style={{ margin: 0 }}>Progress</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--primary-blue)' }}>{progress}%</span>
            </div>
            <div className="progress-container">
                <div
                    className={`progress-bar ${progress === 100 ? 'progress-bar-success' : ''}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div style={{
                fontSize: '11px',
                color: 'var(--text-grey)',
                marginTop: '6px',
                textAlign: 'center',
                fontStyle: 'italic',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }}>
                {status}
            </div>
        </div>
    );
};
