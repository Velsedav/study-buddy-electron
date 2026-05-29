import { type MetacognitionLog } from '../lib/db';
import ObsidianMetacognitionLogs from './ObsidianMetacognitionLogs';

export function getMonthKey(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(key: string): string {
    const [year, month] = key.split('-');
    return new Date(Number(year), Number(month) - 1, 1)
        .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function formatForNotebookLM(logs: MetacognitionLog[], monthLabel: string): string {
    const entries = logs.map((log, i) => {
        const date = new Date(log.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
        return [
            `--- Entry ${i + 1} · ${date} ---`,
            `Priorités & Coefficients: ${log.memorization_align || 'N/A'}`,
            `Problèmes & Malaises: ${log.focus_drop || 'N/A'}`,
            `Règle Système: ${log.mechanical_fix || 'Aucune règle définie.'}`,
            `Zones à Réviser (La Boussole): ${log.retention || 'N/A'}`,
        ].join('\n');
    }).join('\n\n');

    return `# Logs Mode Optimisation — ${monthLabel}\n\nVoici mes logs de réflexion sur ma stratégie d'étude pour ce mois. Merci d'analyser ces entrées et de me donner un retour sur :\n- Les patterns récurrents dans mes problèmes et priorités\n- Si mes règles système s'attaquent aux vraies causes\n- Les ajustements concrets à apporter à ma stratégie le mois prochain\n\n${entries}`;
}

export default function MetacognitionLogs() {
    return <ObsidianMetacognitionLogs />;
}
