export type AppRoute =
  | 'home'
  | 'journal'
  | 'journal-new'
  | 'exposure'
  | 'exposure-new'
  | 'exposure-session'
  | 'care-plan'
  | 'breathing'
  | 'grounding'
  | 'body-scan'
  | 'achievements'
  | 'analytics'
  | 'mood'
  | 'care-tree'
  | 'themes'
  | 'export'
  | 'paywall'
  | 'settings'
  | 'notifications'
  | 'quick-notes';

export interface RouterState {
  route: AppRoute;
  params: Record<string, string>;
  history: AppRoute[];
}

export const initialRouterState: RouterState = {
  route: 'home',
  params: {},
  history: [],
};
