import type { Theme } from '../lib/settings';

export interface ThemeOption {
    id: Theme;
    name: string;
    color: string;
    background?: string;
}

export const THEME_GROUPS: { name: string; themes: ThemeOption[] }[] = [
    {
        name: 'Sailor Moon',
        themes: [
            { id: 'classic-uniform', name: 'Classic Uniform', color: '#1c3272' },
            { id: 'cosmic-manicure', name: 'Cosmic Manicure', color: '#9024f2' },
            { id: 'chibi-moon', name: 'Chibi Moon', color: '#ffb3e1' },
            { id: 'transformation-ribbon', name: 'Transformation Ribbon', color: '#9d5ceb', background: 'linear-gradient(120deg, #b08dd9 0%, #63ccd4 100%)' },
        ]
    },
    {
        name: 'Terminal',
        themes: [
            { id: 'terminal-orange', name: 'Orange Terminal', color: '#ff8c00' },
            { id: 'terminal-green', name: 'Green Terminal', color: '#00ff00' },
            { id: 'terminal-red', name: 'Red Terminal', color: '#ff0000' },
            { id: 'terminal-cyan', name: 'CLI / Cyan', color: '#00d4ff' },
            { id: 'terminal-amber', name: 'Amber Terminal', color: '#ffaa00' },
            { id: 'terminal-acid', name: 'Acid Terminal', color: '#aaff00' },
            { id: 'terminal-blue', name: 'Blue Terminal', color: '#4499ff' },
        ]
    },
    {
        name: 'Art',
        themes: [
            { id: 'starry-night', name: 'Starry Night', color: '#e8c84a', background: 'linear-gradient(135deg, #0d1b3e 0%, #1e4888 55%, #e8c84a 100%)' },
            { id: 'designers-republic', name: 'TDR — Signal', color: '#e8001d', background: 'linear-gradient(135deg, #f0ede6 0%, #ffffff 45%, #e8001d 100%)' },
            { id: 'tdr-blue', name: 'TDR — Blueprint', color: '#0055cc', background: 'linear-gradient(135deg, #f0ede6 0%, #ffffff 45%, #0055cc 100%)' },
            { id: 'tdr-ember', name: 'TDR — Ember', color: '#e86000', background: 'linear-gradient(135deg, #f0ede6 0%, #ffffff 45%, #e86000 100%)' },
            { id: 'tdr-night', name: 'TDR — Night', color: '#ff1a2d', background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 45%, #ff1a2d 100%)' },
            { id: 'tdr-warp', name: 'TDR — Warp', color: '#f5d000', background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 45%, #f5d000 100%)' },
            { id: 'tdr-acid', name: 'TDR — Acid', color: '#aaff00', background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 45%, #aaff00 100%)' },
        ]
    },
    {
        name: 'Modern & Experimental',
        themes: [
            { id: 'pastel', name: 'Pastel Baseline', color: '#f08cb8' },
            { id: 'neumorphism', name: 'Neumorphism', color: '#9baec8' },
            { id: 'neobrutalism', name: 'Neobrutalism', color: '#ffde59' },
            { id: 'honey-lemon', name: 'Honey Lemon', color: '#ffeb3b' },
            { id: 'ai-pro', name: 'AI Pro', color: '#7c3aed', background: 'linear-gradient(135deg, #070b14 0%, #1a0a3d 50%, #06b6d4 100%)' },
            { id: 'cyber-scan', name: 'Cyber Scan', color: '#b8ff00', background: 'linear-gradient(135deg, #050510 0%, #0a0830 50%, #b8ff00 100%)' },
        ]
    },
    {
        name: 'Redesign',
        themes: [
            { id: 'obsidian', name: 'Obsidian', color: '#58a6ff', background: 'linear-gradient(135deg, #0d1117 0%, #161b22 50%, #58a6ff 100%)' },
            { id: 'obsidian-terminal-green',     name: 'Obsidian — Terminal Green',     color: '#39ff14', background: 'linear-gradient(135deg, #0a1a0c 0%, #0f2412 50%, #39ff14 100%)' },
            { id: 'obsidian-terminal-orange',    name: 'Obsidian — Terminal Orange',    color: '#ff9e1f', background: 'linear-gradient(135deg, #1a0f00 0%, #261800 50%, #ff9e1f 100%)' },
            { id: 'obsidian-designers-republic', name: 'Obsidian — TDR',                color: '#ff0066', background: 'linear-gradient(135deg, #0a0a14 0%, #14142e 50%, #ff0066 100%)' },
            { id: 'obsidian-cyberpunk',          name: 'Obsidian — Cyberpunk',          color: '#fcee0a', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #fcee0a 100%)' },
            { id: 'obsidian-dracula',            name: 'Obsidian — Dracula',            color: '#bd93f9', background: 'linear-gradient(135deg, #282a36 0%, #383a47 50%, #bd93f9 100%)' },
            { id: 'obsidian-nord',               name: 'Obsidian — Nord',               color: '#88c0d0', background: 'linear-gradient(135deg, #2e3440 0%, #3b4252 50%, #88c0d0 100%)' },
            { id: 'obsidian-monokai',            name: 'Obsidian — Monokai',            color: '#f92672', background: 'linear-gradient(135deg, #272822 0%, #3e3d32 50%, #f92672 100%)' },
            { id: 'obsidian-tokyo-night',        name: 'Obsidian — Tokyo Night',        color: '#7aa2f7', background: 'linear-gradient(135deg, #1a1b26 0%, #24283b 50%, #7aa2f7 100%)' },
            { id: 'obsidian-solarized-dark',     name: 'Obsidian — Solarized',          color: '#268bd2', background: 'linear-gradient(135deg, #002b36 0%, #073642 50%, #268bd2 100%)' },
            { id: 'obsidian-gruvbox',            name: 'Obsidian — Gruvbox',            color: '#fe8019', background: 'linear-gradient(135deg, #282828 0%, #3c3836 50%, #fe8019 100%)' },
            { id: 'obsidian-catppuccin',         name: 'Obsidian — Catppuccin',         color: '#cba6f7', background: 'linear-gradient(135deg, #1e1e2e 0%, #313244 50%, #cba6f7 100%)' },
            { id: 'obsidian-ayu',                name: 'Obsidian — Ayu',                color: '#ffcc66', background: 'linear-gradient(135deg, #1f2430 0%, #232834 50%, #ffcc66 100%)' },
        ]
    }
];
