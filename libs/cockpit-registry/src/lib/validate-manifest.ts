import type { CockpitManifestEntry, CockpitManifestIdentity } from './manifest.types';

const identityKey = ({
  product,
  section,
  topic,
  page,
  language,
}: CockpitManifestIdentity): string =>
  `${product}/${section}/${topic}/${page}/${language}`;

export const validateCockpitManifest = (manifest: CockpitManifestEntry[]): string[] => {
  const errors: string[] = [];
  const identities = new Set<string>();

  for (const entry of manifest) {
    const key = identityKey(entry);

    if (identities.has(key)) {
      errors.push(`Duplicate canonical identity: ${key}`);
    } else {
      identities.add(key);
    }
  }

  for (const entry of manifest) {
    const targetKey = identityKey(entry.fallbackTarget);

    if (!identities.has(targetKey)) {
      errors.push(`Invalid fallback target for ${identityKey(entry)}: ${targetKey}`);
    }
  }

  for (const entry of manifest) {
    if (!entry.testingContract) {
      errors.push(`Missing testing contract for ${identityKey(entry)}`);
      continue;
    }

    if (entry.entryKind === 'capability' && !entry.testingContract.smokeTarget) {
      errors.push(`Missing smoke target for ${identityKey(entry)}`);
    }

    if (!entry.testingContract.deploySmokePath.startsWith('/')) {
      errors.push(`Invalid deploy smoke path for ${identityKey(entry)}`);
    }

    if (
      entry.testingContract.integrationMode !== 'none' &&
      !entry.testingContract.integrationTarget
    ) {
      errors.push(`Missing integration target for ${identityKey(entry)}`);
    }
  }

  return errors;
};
