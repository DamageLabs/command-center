export interface PanelAction {
  id: string;
  label: string;
  icon?: string;
  tone?: 'default' | 'accent';
  disabled?: boolean;
}
