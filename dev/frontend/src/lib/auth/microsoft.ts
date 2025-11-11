'use client';

import type { Configuration, PopupRequest } from '@azure/msal-browser'

export async function signInWithMicrosoft(): Promise<{ idToken?: string } | null> {
  if (typeof window === 'undefined') return null
  try {
    const { PublicClientApplication } = await import('@azure/msal-browser')

    const clientId = process.env.NEXT_PUBLIC_MSAL_CLIENT_ID
    const authority = process.env.NEXT_PUBLIC_MSAL_AUTHORITY || 'https://login.microsoftonline.com/common'
    if (!clientId) return null

    const config: Configuration = {
      auth: {
        clientId,
        authority,
        redirectUri: typeof window !== 'undefined' ? window.location.origin : undefined,
      },
      cache: { cacheLocation: 'localStorage' },
    }

    const msal = new PublicClientApplication(config)
    await msal.initialize()

    const request: PopupRequest = {
      scopes: ['openid', 'profile', 'email'],
    }

    const result = await msal.loginPopup(request)
    const idToken = result?.idToken
    return { idToken }
  } catch (e) {
    return null
  }
}
