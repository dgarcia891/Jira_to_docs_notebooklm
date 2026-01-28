import React from 'react';

export const containerStyle: React.CSSProperties = {
    position: 'relative',
    padding: '20px',
    width: '320px',
    fontFamily: '"Inter", "Segoe UI", sans-serif',
    backgroundColor: '#ffffff',
    color: '#172B4D',
};

export const buttonStyle: React.CSSProperties = {
    backgroundColor: '#0052CC',
    color: 'white',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    width: '100%',
    marginTop: '10px',
};

export const secondaryButtonStyle: React.CSSProperties = {
    backgroundColor: 'transparent',
    color: '#0052CC',
    border: '1px solid #0052CC',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    marginTop: '5px',
};

export const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#172B4D',
    display: 'block',
    marginBottom: '4px',
    marginTop: '12px'
};

export const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #DFE1E6',
    marginTop: '10px',
    backgroundColor: '#FAFBFC',
};

export function getStatusBackgroundColor(type: 'info' | 'success' | 'error' | 'debug') {
    switch (type) {
        case 'error': return '#FFEBE6';
        case 'success': return '#E3FCEF';
        case 'info': return '#DEEBFF';
        case 'debug': return '#F4F5F7';
        default: return '#F4F5F7';
    }
}

export function getStatusColor(type: 'info' | 'success' | 'error' | 'debug') {
    switch (type) {
        case 'error': return '#BF2600';
        case 'success': return '#006644';
        case 'info': return '#0052CC';
        case 'debug': return '#42526E';
        default: return '#42526E';
    }
}

export const getPrimaryButtonStyle = (isPrimary: boolean) => ({
    ...buttonStyle,
    backgroundColor: isPrimary ? '#0052CC' : '#EBECF0',
    color: isPrimary ? 'white' : '#42526E',
});

export const getEpicButtonStyle = (isPrimary: boolean) => ({
    ...secondaryButtonStyle,
    backgroundColor: isPrimary ? '#E9F2FF' : 'transparent',
    borderColor: '#0052CC',
    color: '#0052CC',
    borderWidth: isPrimary ? '2px' : '1px',
});
export const textLinkStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#0052CC',
    cursor: 'pointer',
    fontSize: '12px',
    textDecoration: 'underline',
    padding: '4px 8px',
};

export const iconButtonStyle: React.CSSProperties = {
    background: '#F4F5F7',
    border: '1px solid #DFE1E6',
    borderRadius: '4px',
    padding: '4px 8px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
};
