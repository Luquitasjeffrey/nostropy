import { API_URL } from '../config';

export const refreshToken = async (): Promise<string | null> => {
    const pubkey = localStorage.getItem('nostr_npub') || localStorage.getItem('playerPubkey');
    if (!pubkey) {
        console.error('No player pubkey found in localStorage, cannot fetch JWT');
        return null;
    }

    try {
        const response = await fetch(`${API_URL}/api/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ pubkey }),
        });

        if (!response.ok) {
            throw new Error(`Failed to refresh token: ${response.statusText}`);
        }

        const data = await response.json();
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

export const authRequest = async (url: string | URL | Request, options: RequestInit = {}): Promise<Response> => {
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
