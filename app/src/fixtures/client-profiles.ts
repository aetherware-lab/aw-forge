import type { ClientProfile } from '@/types';

/**
 * Seed client profiles. In production these come from the user's saved
 * capture profile records; for the prototype we hand-roll three plausible
 * GovCon shops so the Feed has something to attribute matches to.
 */
export const CLIENT_PROFILES: ClientProfile[] = [
  {
    id: 'cp-001',
    name: 'Acme Cyber Solutions',
    naics: ['541512', '541519', '541611'],
    setAsides: ['8(a)', 'SDVOSB'],
    capabilities: ['CMMC', 'Cyber Threat Intel', 'SOC Operations', 'Incident Response'],
    geographies: ['CONUS', 'OCONUS'],
  },
  {
    id: 'cp-002',
    name: 'Bridgepoint Cloud',
    naics: ['518210', '541512', '541519'],
    setAsides: ['WOSB'],
    capabilities: ['Cloud Migration', 'FedRAMP', 'Kubernetes', 'DevSecOps'],
    geographies: ['CONUS'],
  },
  {
    id: 'cp-003',
    name: 'Northstar Health IT',
    naics: ['541512', '621111', '622110'],
    setAsides: ['HUBZone'],
    capabilities: ['EHR Modernization', 'HL7 / FHIR', 'Health Data Interop', 'HIPAA'],
    geographies: ['CONUS'],
  },
];
