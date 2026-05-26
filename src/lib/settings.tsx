import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { setAudioTheme } from './sounds';

export type Theme = 'pastel' | 'neumorphism' | 'neobrutalism' | 'terminal-orange' | 'terminal-green' | 'terminal-red' | 'terminal-cyan' | 'terminal-amber' | 'terminal-acid' | 'terminal-blue' | 'classic-uniform' | 'cosmic-manicure' | 'chibi-moon' | 'transformation-ribbon' | 'honey-lemon' | 'ai-pro' | 'cyber-scan' | 'starry-night' | 'designers-republic' | 'tdr-blue' | 'tdr-ember' | 'tdr-night' | 'tdr-warp' | 'tdr-acid';

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
    theme: 'pastel',
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
                return { ...defaultSettings, ...JSON.parse(saved) };
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
