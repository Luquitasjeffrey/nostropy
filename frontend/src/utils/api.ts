import { API_URL } from '../config';
import { nip19, finalizeEvent } from 'nostr-tools';

export const refreshToken = async (): Promise<string | null> => {
  const nsec = localStorage.getItem('nostr_nsec');
  const pubkey = localStorage.getItem('nostr_npub') || localStorage.getItem('playerPubkey');

  if (!pubkey) {
    console.error('No player pubkey found in localStorage, cannot fetch JWT');
    return null;
  }
  if (!nsec) {
    console.error('No player nsec found in localStorage, cannot sign auth event');
    return null;
  }

  try {
    const decoded = nip19.decode(nsec);
    if (decoded.type !== 'nsec') throw new Error('Invalid nsec type');
    const privateKey = decoded.data as Uint8Array;

    // 1. Fetch challenge
    const challengeRes = await fetch(`${API_URL}/api/auth/challenge`);
    if (!challengeRes.ok) throw new Error('Failed to fetch challenge');
    const { challenge } = await challengeRes.json();

    // 2. Sign Nostr event
    const eventTemplate = {
      kind: 27235, // typical HTTP auth kind
      created_at: Math.floor(Date.now() / 1000),
      tags: [['challenge', challenge]],
      content: '',
    };
    const signedEvent = finalizeEvent(eventTemplate, privateKey);

    // 3. Verify
    const verifyRes = await fetch(`${API_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event: signedEvent }),
    });

    if (!verifyRes.ok) {
      throw new Error(`Failed to verify token: ${verifyRes.statusText}`);
    }

    const data = await verifyRes.json();
    const { token } = data;

    if (token) {
      localStorage.setItem('jwt_token', token);
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

export const authRequest = async (
  url: string | URL | Request,
  options: RequestInit = {}
): Promise<Response> => {
  let token = localStorage.getItem('jwt_token');

  if (!token) {
    token = await refreshToken();
  }

  const modifiedOptions = { ...options };
  modifiedOptions.headers = new Headers(modifiedOptions.headers || {});

  if (token) {
    modifiedOptions.headers.set('Authorization', `Bearer ${token}`);
  }

  let response = await fetch(url, modifiedOptions);

  // If unauthorized, token might be invalid/expired, so we refresh and retry once
  if (response.status === 401) {
    token = await refreshToken();
    if (token) {
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${token}`);
      const retryOptions = { ...options, headers: retryHeaders };
      response = await fetch(url, retryOptions);
    }
  }

  return response;
};
