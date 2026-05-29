import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { setAudioTheme, preloadCustomSounds } from './sounds';

export type Theme = 'pastel' | 'neumorphism' | 'neobrutalism' | 'terminal-orange' | 'terminal-green' | 'terminal-red' | 'terminal-cyan' | 'terminal-amber' | 'terminal-acid' | 'terminal-blue' | 'classic-uniform' | 'cosmic-manicure' | 'chibi-moon' | 'transformation-ribbon' | 'honey-lemon' | 'ai-pro' | 'cyber-scan' | 'starry-night' | 'designers-republic' | 'tdr-blue' | 'tdr-ember' | 'tdr-night' | 'tdr-warp' | 'tdr-acid' | 'obsidian' | 'obsidian-terminal-green' | 'obsidian-terminal-orange' | 'obsidian-designers-republic' | 'obsidian-tdr-acid' | 'obsidian-kokedera' | 'obsidian-cyberpunk' | 'obsidian-dracula' | 'obsidian-nord' | 'obsidian-monokai' | 'obsidian-tokyo-night' | 'obsidian-solarized-dark' | 'obsidian-gruvbox' | 'obsidian-catppuccin' | 'obsidian-catppuccin-latte' | 'obsidian-catppuccin-frappe' | 'obsidian-catppuccin-macchiato' | 'obsidian-ayu' | 'obsidian-starry-night'
  | 'obsidian-pastel' | 'obsidian-neumorphism' | 'obsidian-neobrutalism'
  | 'obsidian-classic-uniform' | 'obsidian-cosmic-manicure' | 'obsidian-chibi-moon'
  | 'obsidian-transformation-ribbon' | 'obsidian-honey-lemon' | 'obsidian-ai-pro'
  | 'obsidian-cyber-scan' | 'obsidian-terminal-red' | 'obsidian-terminal-cyan'
  | 'obsidian-terminal-amber' | 'obsidian-terminal-acid' | 'obsidian-terminal-blue'
  | 'obsidian-tdr-blue' | 'obsidian-tdr-ember' | 'obsidian-tdr-night' | 'obsidian-tdr-warp';

/** Classic theme ids removed in the redesign unification → obsidian equivalents. */
const LEGACY_THEME_MAP: Record<string, Theme> = {
  'pastel': 'obsidian-pastel',
  'neumorphism': 'obsidian-neumorphism',
  'neobrutalism': 'obsidian-neobrutalism',
  'classic-uniform': 'obsidian-classic-uniform',
  'cosmic-manicure': 'obsidian-cosmic-manicure',
  'chibi-moon': 'obsidian-chibi-moon',
  'transformation-ribbon': 'obsidian-transformation-ribbon',
  'honey-lemon': 'obsidian-honey-lemon',
  'ai-pro': 'obsidian-ai-pro',
  'cyber-scan': 'obsidian-cyber-scan',
  'starry-night': 'obsidian-starry-night',
  'designers-republic': 'obsidian-designers-republic',
  'terminal-orange': 'obsidian-terminal-orange',
  'terminal-green': 'obsidian-terminal-green',
  'terminal-red': 'obsidian-terminal-red',
  'terminal-cyan': 'obsidian-terminal-cyan',
  'terminal-amber': 'obsidian-terminal-amber',
  'terminal-acid': 'obsidian-terminal-acid',
  'terminal-blue': 'obsidian-terminal-blue',
  'tdr-blue': 'obsidian-tdr-blue',
  'tdr-ember': 'obsidian-tdr-ember',
  'tdr-night': 'obsidian-tdr-night',
  'tdr-warp': 'obsidian-tdr-warp',
  'tdr-acid': 'obsidian-tdr-acid',
};

/** Map a possibly-legacy stored theme id to a valid current Theme. */
export function migrateTheme(theme: string): Theme {
  if (theme in LEGACY_THEME_MAP) return LEGACY_THEME_MAP[theme];
  if (theme.startsWith('obsidian')) return theme as Theme;
  return 'obsidian-pastel';
}

/** True for any theme whose name starts with "terminal-". Works for future themes automatically. */
export function isTerminalTheme(theme: Theme | string): boolean {
    return theme.startsWith('terminal-');
}
export type WeekStart = 'monday' | 'sunday';
export type MetacognitionDay = 'friday' | 'saturday' | 'sunday';

interface Settings {
    theme: Theme;
    weekStart: WeekStart;
    language: string;
    zoomLevel: number;
    metacognitionDay: MetacognitionDay;
    performanceMode: boolean;
}

const isLinux = (window as any).electronAPI?.platform === 'linux';

const defaultSettings: Settings = {
    theme: 'obsidian-pastel',
    weekStart: 'monday',
    language: 'en',
    zoomLevel: 100,
    metacognitionDay: 'saturday',
    performanceMode: isLinux,
};

interface SettingsContextType extends Settings {
    isTerminal: boolean;
    setTheme: (t: Theme) => void;
    setWeekStart: (w: WeekStart) => void;
    setLanguage: (l: string) => void;
    setZoomLevel: (z: number) => void;
    setMetacognitionDay: (d: MetacognitionDay) => void;
    setPerformanceMode: (v: boolean) => void;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettingsState] = useState<Settings>(() => {
        const saved = localStorage.getItem('study-buddy-settings');
        if (saved) {
            try {
                const merged = { ...defaultSettings, ...JSON.parse(saved) };
                return { ...merged, theme: migrateTheme(merged.theme) };
            } catch (e) {
                console.error("Failed to parse settings", e);
            }
        }
        return defaultSettings;
    });

    useEffect(() => {
        localStorage.setItem('study-buddy-settings', JSON.stringify(settings));

        document.documentElement.setAttribute('data-theme', settings.theme);
        setAudioTheme(settings.theme);
        (document.body.style as any).zoom = (settings.zoomLevel / 100).toString();
        document.documentElement.classList.toggle('linux-perf', settings.performanceMode);
    }, [settings]);

    // Preload user-supplied custom sounds once at startup
    useEffect(() => {
        void preloadCustomSounds();
    }, []);

    // Global Ctrl+Scroll listener
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setSettingsState(prev => {
                    const newZoom = e.deltaY > 0
                        ? Math.max(50, prev.zoomLevel - 10)
                        : Math.min(200, prev.zoomLevel + 10);
                    return { ...prev, zoomLevel: newZoom };
                });
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, []);

    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        setSettingsState(s => ({ ...s, [key]: value }));
    };

    return (
        <SettingsContext.Provider value={{
            ...settings,
            isTerminal: isTerminalTheme(settings.theme),
            setTheme: (t) => updateSetting('theme', t),
            setWeekStart: (w) => updateSetting('weekStart', w),
            setLanguage: (l) => updateSetting('language', l),
            setZoomLevel: (z) => updateSetting('zoomLevel', z),
            setMetacognitionDay: (d) => updateSetting('metacognitionDay', d),
            setPerformanceMode: (v) => updateSetting('performanceMode', v),
            updateSetting
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) throw new Error("useSettings must be used within SettingsProvider");
    return context;
}
