import { useEffect, useState } from 'react';

export const appVersion = '2026-08-17-22';

type VersionFile = {
  version?: string;
};

export type VersionStatus = {
  latestVersion: string;
  outdated: boolean;
};

export function useVersionStatus(): VersionStatus {
  const [latestVersion, setLatestVersion] = useState(appVersion);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    fetch(`${import.meta.env.BASE_URL}version.json?v=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() as Promise<VersionFile> : null)
      .then((data) => {
        if (alive && data?.version) {
          setLatestVersion(data.version);
        }
      })
      .catch(() => undefined);

    return () => {
      alive = false;
      controller.abort();
    };
  }, []);

  return {
    latestVersion,
    outdated: latestVersion !== appVersion,
  };
}
