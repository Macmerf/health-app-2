export type AppRoute =
  | 'home'
  | 'journal'
  | 'journal-new'
  | 'journal-history'
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
  | 'paywall'
  | 'settings'
  | 'notifications';

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
