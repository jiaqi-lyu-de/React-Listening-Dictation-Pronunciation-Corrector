import React, { useState, useEffect } from 'react';
import './WordSidebar.css';

const WordSidebar = () => {
    const [words, setWords] = useState([]);
    const [saving, setSaving] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event) => {
            // Command/Ctrl + B
            if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
                event.preventDefault();
                const selection = window.getSelection().toString().trim();
                if (selection) {
                    addWord(selection);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Also auto-show when words are added if it was hidden
    const addWord = (word) => {
        setWords(prev => {
            if (prev.some(w => w.toLowerCase() === word.toLowerCase())) {
                return prev;
            }
            setIsVisible(true);
            return [...prev, word];
        });
    };

    const removeWord = (index) => {
        setWords(prev => prev.filter((_, i) => i !== index));
    };

    const saveWords = async () => {
        if (words.length === 0) return;

        setSaving(true);
        try {
            const response = await fetch('http://localhost:8888/save-words', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ words })
            });

            if (response.ok) {
                // Subtle success feedback could go here
                setWords([]);
                setIsVisible(false);
            } else {
                alert('Failed to save words.');
            }
        } catch (error) {
            console.error('Error saving words:', error);
            alert('Error saving words.');
        } finally {
            setSaving(false);
        }
    };

    if (!isVisible && words.length === 0) return null;

    return (
        <div className="word-sidebar-container">
            {!isVisible && words.length > 0 && (
                <button 
                    className="sidebar-toggle-pill"
                    onClick={() => setIsVisible(true)}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="m18 15-6-6-6 6"/></svg>
                    Words ({words.length})
                </button>
            )}
            
            {(isVisible || words.length === 0) && (
                <div className="word-sidebar">
                <div className="sidebar-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3>Vocabulary</h3>
                        <span className="word-count-badge">{words.length}</span>
                    </div>
                    <button 
                        className="remove-btn" 
                        onClick={() => setIsVisible(false)}
                        style={{ color: '#999' }}
                        title="Hide Sidebar"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>

                <div className="word-list-items">
                    {words.length === 0 ? (
                        <div className="empty-message">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '12px' }}>
                                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M8 7h6"/><path d="M8 11h8"/>
                            </svg>
                            <p>Select text and press <br/><span className="shortcut-hint">⌘ + B</span> to add words</p>
                        </div>
                    ) : (
                        words.map((word, index) => (
                            <li key={index} className="word-item-sidebar">
                                <span className="word-text">{word}</span>
                                <button className="remove-btn" onClick={() => removeWord(index)}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                </button>
                            </li>
                        ))
                    )}
                </div>

                <div className="sidebar-footer">
                    <button
                        className="save-btn"
                        onClick={saveWords}
                        disabled={saving || words.length === 0}
                    >
                        {saving ? (
                            <>
                                <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                Saving...
                            </>
                        ) : (
                            <>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                                Save to Vocabulary
                            </>
                        )}
                    </button>
                    <style>{`
                        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                    `}</style>
                </div>
            </div>
            )}
        </div>
    );
};

export default WordSidebar;
