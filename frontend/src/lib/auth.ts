import { QueryClient } from '@tanstack/react-query'
import { createOrUpdateUser, saveUserTracks } from './supabase'
import { generateCodeVerifier, generateCodeChallenge } from './utils'

export const handleSpotifyLogin = async (setError: (error: string | null) => void) => {
    try {
        const verifier = generateCodeVerifier(128)
        const challenge = await generateCodeChallenge(verifier)
        localStorage.setItem('verifier', verifier)

        const params = new URLSearchParams()
        params.append("client_id", import.meta.env.VITE_SPOTIFY_CLIENT_ID)
        params.append("response_type", "code")
        params.append("redirect_uri", import.meta.env.VITE_REDIRECT_URI)
        params.append("scope", "user-top-read")
        params.append("code_challenge_method", "S256")
        params.append("code_challenge", challenge)

        const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`
        window.location.href = authUrl
    } catch (error) {
        console.error('Error during login setup:', error)
        setError('Failed to initialize login. Please try again.')
    }
}

export const handleSpotifyLogout = (queryClient: QueryClient) => {
    localStorage.removeItem('spotify_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('username')
    localStorage.removeItem('verifier')
    queryClient.clear()
}

export const exchangeCodeForToken = async (
    code: string,
    verifier: string,
    setToken: (token: string | null) => void,
    setUserId: (userId: string | null) => void,
    setError: (error: string | null) => void,
    queryClient: QueryClient
) => {
    const params = new URLSearchParams()
    params.append("client_id", import.meta.env.VITE_SPOTIFY_CLIENT_ID)
    params.append("grant_type", "authorization_code")
    params.append("code", code)
    params.append("redirect_uri", import.meta.env.VITE_REDIRECT_URI)
    params.append("code_verifier", verifier)

    try {
        const response = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params
        })

        const data = await response.json()
        if (!response.ok) {
            if (data.error === 'invalid_grant') {
                throw new Error('Authentication session expired. Please try logging in again.')
            }
            throw new Error(data.error_description || data.error || 'Failed to exchange code for token')
        }

        if (!data || !data.access_token) {
            throw new Error('No access token received from Spotify')
        }

        localStorage.setItem('spotify_token', data.access_token)
        setToken(data.access_token)

        // Get user profile from Spotify
        const userResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: { 'Authorization': `Bearer ${data.access_token}` }
        })

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user profile from Spotify')
        }

        const userData = await userResponse.json()
        const dbUser = await createOrUpdateUser(userData.display_name, userData.id)
        localStorage.setItem('user_id', dbUser.id)
        localStorage.setItem('username', userData.display_name)

        // Get top tracks
        const tracksResponse = await fetch(
            'https://api.spotify.com/v1/me/top/tracks?time_range=short_term&limit=5',
            {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
            }
        )

        if (!tracksResponse.ok) {
            throw new Error('Failed to fetch top tracks from Spotify')
        }

        const tracksData = await tracksResponse.json()
        if (!tracksData.items?.length) {
            throw new Error('No top tracks found in the last 4 weeks. Try listening to more music!')
        }

        const savedTracks = await saveUserTracks(dbUser.id, tracksData.items)
        queryClient.setQueryData(['tracks', dbUser.id], savedTracks)
        setUserId(dbUser.id)
        await queryClient.invalidateQueries({ queryKey: ['all-user-tracks'] })

    } catch (error: any) {
        console.error('Authentication error:', error)
        setError(`Authentication failed: ${error.message}`)
        handleSpotifyLogout(queryClient)
        throw error
    }
} 