import { createContext, useContext } from 'react';
import type { components } from '@melbourne-sphere/contracts';
export type BrandingSettings = components['schemas']['PublicSiteSettingsDto'];
export const BrandingContext = createContext<BrandingSettings | null>(null);
export const useBranding = () => useContext(BrandingContext);
