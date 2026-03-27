import { createContext, useContext } from 'react';

export interface BadgesContextType {
  refreshBadges: () => void;
}

export const BadgesContext = createContext<BadgesContextType>({
  refreshBadges: () => {},
});

export function useBadges() {
  return useContext(BadgesContext);
}
