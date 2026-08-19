export type RogerCompanionStatus =
  | 'connected'
  | 'disconnected'
  | 'not_installed'
  | 'error'
  | 'loading'
  | 'no_extension_id';

export type RogerCompanionResponse = {
  status?: RogerCompanionStatus;
  error?: string;
} & Record<string, unknown>;

export const extension = {
  id:
    process.env.NEXT_PUBLIC_EXTENSION_ID ??
    process.env.NEXT_PUBLIC_ROGER_EXTENSION_ID ??
    'fbdahldhfjfphmpoelhidodpijhcdjlk',
  url:
    process.env.NEXT_PUBLIC_EXTENSION_URL ??
    process.env.NEXT_PUBLIC_ROGER_EXTENSION_URL ??
    '',
};

export function isMobileClient() {
  if (typeof window === 'undefined') return false;
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator.userAgent) ||
    window.matchMedia('(max-width: 768px)').matches
  );
}

export function canCheckExtension() {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.sendMessage;
}

export function getChromeRuntimeDiagnostics() {
  const chromeDefined = typeof chrome !== 'undefined';
  return {
    chromeDefined,
    sendMessage: chromeDefined ? typeof chrome.runtime?.sendMessage : 'no-chrome',
    lastError: chromeDefined ? chrome.runtime?.lastError?.message : undefined,
  };
}

export type CompanionGateSnapshot = {
  chrome: ReturnType<typeof getChromeRuntimeDiagnostics>;
  isMobile: boolean;
  extensionCheckable: boolean;
  onDesktop: boolean;
  extensionIdConfigured: boolean;
  extensionId: string;
  extensionUrl: string;
  origin: string;
  queryEnabled: boolean;
};

export function getCompanionGateSnapshot(
  opts: { hasUserId?: boolean; isExtensionLinkedIn?: boolean; impersonating?: boolean } = {},
): CompanionGateSnapshot {
  const { hasUserId = true, isExtensionLinkedIn = true, impersonating = false } = opts;
  const extensionCheckable = canCheckExtension() && !isMobileClient();
  const onDesktop = !isMobileClient();
  const baseEnabled = hasUserId && !impersonating && isExtensionLinkedIn;

  return {
    chrome: getChromeRuntimeDiagnostics(),
    isMobile: isMobileClient(),
    extensionCheckable,
    onDesktop,
    extensionIdConfigured: !!extension.id,
    extensionId: extension.id,
    extensionUrl: extension.url,
    origin: typeof window !== 'undefined' ? window.location.origin : '',
    queryEnabled: baseEnabled && extensionCheckable,
  };
}

export async function fetchRogerCompanionStatus(
  user_id?: string,
  extensionVersion?: string | null,
  extensionIdOverride?: string,
): Promise<RogerCompanionResponse> {
  const extensionId = extensionIdOverride || extension.id;

  return new Promise<RogerCompanionResponse>((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return resolve({ status: 'not_installed' });
    }

    if (!extensionId) {
      return resolve({ status: 'no_extension_id' });
    }

    chrome.runtime.sendMessage(
      extensionId,
      {
        type: 'GET_ROGER_COMPANION_STATUS',
        payload: { user: { id: user_id }, extensionVersion, ping: true },
      },
      (response: unknown) => {
        if (chrome.runtime?.lastError) {
          return resolve({
            status: 'not_installed',
            error: chrome.runtime.lastError.message,
          });
        }
        if (response) {
          return resolve(response as RogerCompanionResponse);
        }
        return reject(new Error('No response from Roger Companion'));
      },
    );
  });
}

export type RogerAiDiagnosisStep = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
  codeRef?: string;
};

export function diagnoseRogerAiCompanionFlow(opts: {
  gate: CompanionGateSnapshot;
  isAuthenticated: boolean;
  isExtensionLinkedIn: boolean;
  isUnipileCredentialsRequired: boolean;
  linkedinUsername?: string | null;
  linkedinConnected?: boolean;
  isFetched: boolean;
  pingData?: RogerCompanionResponse;
  queryError?: string | null;
}): {
  steps: RogerAiDiagnosisStep[];
  showBanner: boolean;
  blockedAt?: string;
} {
  const {
    gate,
    isAuthenticated,
    isExtensionLinkedIn,
    isUnipileCredentialsRequired,
    linkedinUsername,
    linkedinConnected,
    isFetched,
    pingData,
    queryError,
  } = opts;

  const steps: RogerAiDiagnosisStep[] = [
    {
      id: 'session',
      label: 'Session user id present',
      pass: true,
      detail: 'Assumed true on this test page (rogerAI: session?.user.id)',
    },
    {
      id: 'extension-method',
      label: 'linkedinConnectionMethod === EXTENSION',
      pass: isExtensionLinkedIn,
      detail: isExtensionLinkedIn ? 'EXTENSION' : 'not EXTENSION — query disabled',
      codeRef: 'use-linkedin-auth.ts ~194',
    },
    {
      id: 'send-message',
      label: 'chrome.runtime.sendMessage exists',
      pass: gate.chrome.sendMessage === 'function',
      detail: `typeof sendMessage = ${gate.chrome.sendMessage}`,
      codeRef: 'use-linkedin-auth.ts ~189 canCheckExtension',
    },
    {
      id: 'desktop',
      label: 'Not mobile viewport',
      pass: gate.onDesktop,
      detail: gate.isMobile ? 'mobile client detected' : 'desktop',
      codeRef: 'use-linkedin-auth.ts ~196',
    },
    {
      id: 'query-enabled',
      label: 'react-query enabled (auto ping runs)',
      pass: gate.queryEnabled,
      detail: gate.queryEnabled
        ? 'Query will ping extension every 60s + on focus'
        : 'Query disabled — no auto ping, no refetch',
      codeRef: 'use-linkedin-auth.ts ~203',
    },
    {
      id: 'query-fetched',
      label: 'react-query isFetched',
      pass: isFetched,
      detail: isFetched
        ? `ping status: ${pingData?.status ?? 'none'}`
        : gate.queryEnabled
          ? 'waiting for first fetch…'
          : 'never runs — query disabled',
      codeRef: 'use-linkedin-auth.ts ~225',
    },
    {
      id: 'authenticated',
      label: 'isAuthenticated (GET /linkedin/auth-status)',
      pass: isAuthenticated,
      detail: isAuthenticated
        ? 'linkedinConnected true in store'
        : 'false — banner ping branch skipped',
      codeRef: 'use-linkedin-auth.ts ~225',
    },
  ];

  if (queryError) {
    steps.push({
      id: 'query-error',
      label: 'react-query error',
      pass: false,
      detail: queryError,
    });
  }

  if (isUnipileCredentialsRequired) {
    return {
      steps,
      showBanner: true,
      blockedAt: 'CREDENTIALS_REQUIRED → setShowBanner(true)',
    };
  }

  if (linkedinUsername && !linkedinConnected && !isAuthenticated) {
    return {
      steps,
      showBanner: true,
      blockedAt: 'stale username, not connected → setShowBanner(true)',
    };
  }

  if (!isExtensionLinkedIn || !gate.extensionCheckable) {
    return {
      steps,
      showBanner: false,
      blockedAt: '!isExtensionLinkedIn || !extensionCheckable → setShowBanner(false)',
    };
  }

  if (!isFetched || !isAuthenticated) {
    return {
      steps,
      showBanner: false,
      blockedAt: 'ping branch not reached — need isFetched && isAuthenticated',
    };
  }

  const isConnected = pingData?.status === 'connected' || pingData?.status === 'loading';
  const showBanner = !isConnected && !!pingData?.status;

  steps.push({
    id: 'banner',
    label: 'Banner from ping',
    pass: showBanner,
    detail: showBanner
      ? `showBanner true — status=${pingData?.status}`
      : `showBanner false — status=${pingData?.status ?? 'none'}, connected=${isConnected}`,
    codeRef: 'use-linkedin-auth.ts ~226-227',
  });

  return { steps, showBanner };
}
