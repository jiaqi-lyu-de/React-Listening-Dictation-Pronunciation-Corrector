import React, { useState, useEffect } from 'react';
import './WordSidebar.css';

const WordSidebar = () => {
    const [words, setWords] = useState([]);
    const [saving, setSaving] = useState(false);

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

    const addWord = (word) => {
        setWords(prev => {
            // Deduplicate case-insensitive
            if (prev.some(w => w.toLowerCase() === word.toLowerCase())) {
                return prev;
            }
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
                alert('Words saved successfully!');
                setWords([]); // Clear local list after save? Or keep it? 
                // User request: "save to json", usually implies appending or archiving.
                // I'll clear it to indicate success, or maybe keeping it is better?
                // Let's clear it to avoid double saving.
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

    if (words.length === 0) return null; // Hide if empty? Or show placeholder?
    // Let's show it always if user wants to see it? Or maybe hidden by default until word added.
    // "recored to page page right side". Explicit request.
    // I will make it always visible if words > 0, or just a small icon if 0.
    // Let's stick to "visible if words exist" for cleaner UI, or minimal handle.

    return (
        <div className="word-sidebar">
            <div className="sidebar-header">
                <h3>Captured Words ({words.length})</h3>
                <button
                    className="save-btn"
                    onClick={saveWords}
                    disabled={saving || words.length === 0}
                >
                    {saving ? 'Saving...' : 'Save to File'}
                </button>
            </div>
            <ul className="word-list-items">
                {words.map((word, index) => (
                    <li key={index} className="word-item-sidebar">
                        <span className="word-text">{word}</span>
                        <button className="remove-btn" onClick={() => removeWord(index)}>×</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default WordSidebar;
