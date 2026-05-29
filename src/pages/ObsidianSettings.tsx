import { useState, useEffect } from 'react';
import { Palette, Brain, Volume2, Database, Power, Zap, Keyboard } from 'lucide-react';
import { useTranslation } from '../lib/i18n';
import { useSettings } from '../lib/settings';
import type { Theme, WeekStart, MetacognitionDay } from '../lib/settings';
import { getAutostart, setAutostart } from '../lib/autostart';
import { CustomSelect } from '../components/CustomSelect';
import { playSFX, SFX } from '../lib/sounds';
import { getDefaultSpacing, setDefaultSpacing, parseSpacing, DEFAULT_SPACING } from '../lib/chapters';
import { THEME_GROUPS } from './settingsThemeGroups';
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
    const {
        theme, setTheme,
        language, setLanguage,
        weekStart, setWeekStart,
        metacognitionDay, setMetacognitionDay,
        performanceMode, setPerformanceMode,
    } = useSettings();
    const [previewThemeId, setPreviewThemeId] = useState<Theme | null>(null);
    const [autostartEnabled, setAutostartEnabled] = useState(false);

    useEffect(() => {
        getAutostart().then(setAutostartEnabled);
    }, []);

    const ALL_THEMES = THEME_GROUPS.flatMap(g => g.themes);
    const displayThemeId = previewThemeId ?? theme;
    const activeThemeObj = ALL_THEMES.find(t => t.id === displayThemeId) || ALL_THEMES[0];
    const activeThemeName = activeThemeObj.name;

    const handleThemeHover = (id: Theme) => {
        setPreviewThemeId(id);
        document.documentElement.setAttribute('data-theme', id);
    };
    const handleThemeLeave = () => {
        setPreviewThemeId(null);
        document.documentElement.setAttribute('data-theme', theme);
    };

    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.look_and_feel') || 'Look & feel'}</h1>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">{t('settings.theme') || 'Theme'}</h2>
                <p className="obs-settings-hint">
                    {previewThemeId
                        ? `${t('settings.preview_theme') || 'Previewing'}: ${activeThemeName} — ${t('settings.click_to_apply') || 'click to apply'}`
                        : `${t('settings.select_theme') || 'Active'}: ${activeThemeName}`}
                </p>
                <div className="obs-settings-theme-grid" onMouseLeave={handleThemeLeave}>
                    {THEME_GROUPS.map((group) => (
                        <div key={group.name} className="theme-group">
                            <h4 className="theme-group-title">{group.name}</h4>
                            <div className="theme-group-grid">
                                {group.themes.map((th) => (
                                    <button
                                        key={th.id}
                                        type="button"
                                        className={`theme-color-select ${theme === th.id ? 'active' : ''}`}
                                        style={{ background: th.background || th.color }}
                                        onMouseEnter={() => { handleThemeHover(th.id); playSFX(SFX.HOVER); }}
                                        onClick={() => setTheme(th.id)}
                                        title={th.name}
                                        aria-label={th.name}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">{t('settings.language') || 'Language'}</h2>
                <CustomSelect
                    value={language}
                    onChange={(val) => setLanguage(val)}
                    options={[
                        { value: "en", label: "English" },
                        { value: "fr", label: "Français" },
                        { value: "es", label: "Español" },
                        { value: "id", label: "Bahasa Indonesia" },
                        { value: "zh-CN", label: "简体中文 (Simplified Chinese)" },
                        { value: "zh-TW", label: "繁體中文 (Traditional Chinese)" }
                    ]}
                />
            </section>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">{t('settings.preferences') || 'Calendar'}</h2>
                <div>
                    <p className="obs-settings-hint">{t('settings.first_day')}</p>
                    <CustomSelect
                        value={weekStart}
                        onChange={(val) => setWeekStart(val as WeekStart)}
                        options={[
                            { value: "monday", label: t('settings.monday') },
                            { value: "sunday", label: t('settings.sunday') }
                        ]}
                    />
                </div>
                <div>
                    <p className="obs-settings-hint">{t('settings.metacognition_day')}</p>
                    <CustomSelect
                        value={metacognitionDay}
                        onChange={(val) => setMetacognitionDay(val as MetacognitionDay)}
                        options={[
                            { value: "friday", label: t('settings.metacognition_day_friday') },
                            { value: "saturday", label: t('settings.metacognition_day_saturday') },
                            { value: "sunday", label: t('settings.metacognition_day_sunday') }
                        ]}
                    />
                </div>
            </section>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">{t('settings.system_behavior') || 'System behavior'}</h2>
                <label className="obs-settings-toggle">
                    <Power size={15} className="obs-settings-toggle-icon" />
                    {t('settings.launch_at_login')}
                    <input
                        type="checkbox"
                        checked={autostartEnabled}
                        onChange={async (e) => {
                            const val = e.target.checked;
                            setAutostartEnabled(val);
                            await setAutostart(val);
                        }}
                    />
                </label>
                <label className="obs-settings-toggle">
                    <Zap size={15} className="obs-settings-toggle-icon" />
                    {t('settings.performance_mode')}
                    <input
                        type="checkbox"
                        checked={performanceMode}
                        onChange={(e) => setPerformanceMode(e.target.checked)}
                    />
                </label>
                <p className="obs-settings-hint">{t('settings.performance_mode_hint')}</p>
            </section>
        </>
    );
}

function LearningPanel() {
    const { t } = useTranslation();
    const [defaultSpacing, setDefaultSpacingState] = useState(() => getDefaultSpacing());
    const [spacingError, setSpacingError] = useState('');

    const handleSpacingChange = (val: string) => {
        setDefaultSpacingState(val);
        const parsed = parseSpacing(val);
        if (parsed.length === 0) {
            setSpacingError(t('settings.sr_error'));
        } else {
            setSpacingError('');
            setDefaultSpacing(val);
        }
    };

    return (
        <>
            <h1 className="obs-settings-panel-title">{t('settings.learning') || 'Learning'}</h1>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">{t('settings.spaced_repetition')}</h2>
                <p className="obs-settings-hint">{t('settings.sr_desc')}</p>
                <div>
                    <p className="obs-settings-hint">{t('settings.review_intervals')}</p>
                    <div className="obs-settings-row">
                        <input
                            type="text"
                            value={defaultSpacing}
                            onChange={e => handleSpacingChange(e.target.value)}
                            placeholder={DEFAULT_SPACING}
                            style={{ flex: 1 }}
                        />
                        <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                            onMouseEnter={() => playSFX(SFX.HOVER)}
                            onClick={() => handleSpacingChange(DEFAULT_SPACING)}
                        >
                            {t('settings.reset')}
                        </button>
                    </div>
                    {spacingError && (
                        <p className="obs-settings-hint" style={{ color: 'var(--danger)' }}>{spacingError}</p>
                    )}
                </div>
            </section>

            <section className="obs-settings-section">
                <h2 className="obs-settings-section-label">
                    <Keyboard size={14} style={{ verticalAlign: '-2px', marginRight: 6, color: 'var(--text-muted)' }} />
                    {t('settings.shortcuts')}
                </h2>
                <ShortcutList />
            </section>
        </>
    );
}

function ShortcutList() {
    const { t } = useTranslation();
    const shortcuts: { key: string; label: string }[] = [
        { key: 'Cmd/Ctrl + K', label: t('settings.shortcut_search') || 'Quick search' },
        { key: 'Cmd/Ctrl + Enter', label: t('settings.shortcut_save') || 'Save current form' },
        { key: 'Esc', label: t('settings.shortcut_dismiss') || 'Dismiss modal / overlay' },
        { key: 'Space', label: t('settings.shortcut_play') || 'Toggle timer / slideshow' },
    ];
    return (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shortcuts.map(s => (
                <li key={s.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{s.label}</span>
                    <code style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--text-dark)' }}>{s.key}</code>
                </li>
            ))}
        </ul>
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
