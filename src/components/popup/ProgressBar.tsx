import React from 'react';

interface ProgressBarProps {
    progress: number;
    status: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, status }) => {
    return (
        <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#6B778C' }}>PROGRESS</span>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#0052CC' }}>{progress}%</span>
            </div>
            <div style={{
                height: '8px',
                backgroundColor: '#EBECF0',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <div style={{
                    width: `${progress}%`,
                    height: '100%',
                    backgroundColor: progress === 100 ? '#36B37E' : '#0052CC',
                    transition: 'width 0.3s ease-in-out',
                    borderRadius: '4px'
                }} />
            </div>
            <div style={{
                fontSize: '11px',
                color: '#42526E',
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
