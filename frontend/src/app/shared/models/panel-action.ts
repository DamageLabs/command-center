export interface PanelAction {
  id: string;
  label: string;
  icon?: string;
  tone?: 'default' | 'accent';
  disabled?: boolean;
}

export const STANDARD_PANEL_ACTIONS: PanelAction[] = [
  { id: 'refresh', label: 'Refresh', icon: '↻', tone: 'accent' },
  { id: 'copy', label: 'Copy link', icon: '⧉' },
];
