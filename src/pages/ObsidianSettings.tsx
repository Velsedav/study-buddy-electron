import { useState } from 'react';
import { Palette, Brain, Volume2, Database } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import './ObsidianSettings.css';

type Category = 'look-and-feel' | 'learning' | 'audio' | 'system';

export default function ObsidianSettings() {
    const { t } = useTranslation();
    const [category, setCategory] = useState<Category>('look-and-feel');

    const railItems: { id: Category; icon: typeof Palette; label: string }[] = [
        { id: 'look-and-feel', icon: Palette, label: t('settings.look_and_feel') || 'Look & feel' },
        { id: 'learning', icon: Brain, label: t('settings.learning') || 'Learning' },
        { id: 'audio', icon: Volume2, label: t('settings.audio') || 'Audio' },
        { id: 'system', icon: Database, label: t('settings.system') || 'System' },
    ];

    return (
        <div className="obs-settings-root">
            <div className="obs-settings-layout">
                <nav className="obs-settings-rail" aria-label="Settings categories">
                    <div className="obs-settings-rail-header">Settings</div>
                    {railItems.map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            type="button"
                            className={`obs-settings-rail-item${category === id ? ' obs-settings-rail-item--active' : ''}`}
                            onClick={() => setCategory(id)}
                            aria-current={category === id ? 'page' : undefined}
                        >
                            <span className="obs-settings-rail-icon"><Icon size={16} /></span>
                            <span className="obs-settings-rail-label">{label}</span>
                            <span className="obs-settings-rail-tooltip">{label}</span>
                        </button>
                    ))}
                </nav>
                <main className="obs-settings-panel" key={category}>
                    <div className="obs-settings-panel-content">
                        {category === 'look-and-feel' && <LookAndFeelPanel />}
                        {category === 'learning' && <LearningPanel />}
                        {category === 'audio' && <AudioPanel />}
                        {category === 'system' && <SystemPanel />}
                    </div>
                </main>
            </div>
        </div>
    );
}

function LookAndFeelPanel() {
    const { t } = useTranslation();
    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.look_and_feel') || 'Look & feel'}</h1>
            <p className="obs-settings-panel-subtitle">Theme, language, calendar, and system behavior.</p>
        </>
    );
}

function LearningPanel() {
    const { t } = useTranslation();
    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.learning') || 'Learning'}</h1>
            <p className="obs-settings-panel-subtitle">Spaced repetition and keyboard shortcuts.</p>
        </>
    );
}

function AudioPanel() {
    const { t } = useTranslation();
    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.audio') || 'Audio'}</h1>
            <p className="obs-settings-panel-subtitle">Master and per-effect volume.</p>
        </>
    );
}

function SystemPanel() {
    const { t } = useTranslation();
    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.system') || 'System'}</h1>
            <p className="obs-settings-panel-subtitle">Backup, restore, and danger zone.</p>
        </>
    );
}
