import { useState, useEffect, Component, ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import TopTracks from './components/TopTracks.tsx'
import { createOrUpdateUser, saveUserTracks, getAllUserTracks } from './lib/supabase'
import './App.css'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
            gcTime: 30 * 60 * 1000, // Keep unused data in cache for 30 minutes (replaces cacheTime)
        },
    },
})

// Function to generate code verifier
const generateCodeVerifier = (length: number): string => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

// Function to base64url encode an array buffer
const base64urlEncode = (arrayBuffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(arrayBuffer);
    let str = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Function to generate code challenge
const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return base64urlEncode(digest);
}

interface ErrorBoundaryProps {
    children: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('Error caught by boundary:', error, errorInfo)
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="error-container">
                    <h2>Something went wrong</h2>
                    <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
                    <button onClick={() => window.location.reload()}>
                        Reload Page
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}


function AppContent() {
    const [token, setToken] = useState<string | null>(() => {
        return localStorage.getItem('spotify_token') || null
    })
    const [error, setError] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(() => {
        return localStorage.getItem('user_id') || null
    })
    const [isLoading, setIsLoading] = useState(false)
    const queryClient = useQueryClient()

    // Effect to validate stored token on mount
    useEffect(() => {
        const validateStoredToken = async () => {
            const storedToken = localStorage.getItem('spotify_token')
            if (!storedToken) return

            try {
                const response = await fetch('https://api.spotify.com/v1/me', {
                    headers: { 'Authorization': `Bearer ${storedToken}` }
                })

                if (!response.ok) {
                    // Token is invalid, clear storage and state
                    handleLogout()
                }
            } catch (error) {
                console.error('Error validating token:', error)
                handleLogout()
            }
        }

        validateStoredToken()
    }, [])

    // Effect to handle stored user data on mount
    useEffect(() => {
        const storedUserId = localStorage.getItem('user_id')
        const storedUsername = localStorage.getItem('username')

        if (storedUserId && storedUsername) {
            setUserId(storedUserId)
            // Prefetch tracks data if we have a stored userId
            queryClient.prefetchQuery({
                queryKey: ['all-user-tracks'],
                queryFn: getAllUserTracks,
            })
        }
    }, [queryClient])

    useEffect(() => {
        console.log('App mounted, checking URL parameters')
        const urlParams = new URLSearchParams(window.location.search)
        const code = urlParams.get('code')
        console.log('Code from URL:', code ? 'Present' : 'Not present')

        if (code) {
            setIsLoading(true)
            const verifier = localStorage.getItem('verifier')
            console.log('Verifier from localStorage:', verifier ? 'Present' : 'Not present')

            window.history.replaceState({}, document.title, "/")

            if (!verifier) {
                const error = 'No verifier found in localStorage. Please try logging in again.'
                console.error(error)
                setError(error)
                setIsLoading(false)
                return
            }

            console.log('Starting token exchange with Spotify')
            console.log('Using verifier:', verifier)

            const params = new URLSearchParams()
            params.append("client_id", import.meta.env.VITE_SPOTIFY_CLIENT_ID)
            params.append("grant_type", "authorization_code")
            params.append("code", code)
            params.append("redirect_uri", import.meta.env.VITE_REDIRECT_URI)
            params.append("code_verifier", verifier)

            fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: params
            })
                .then(async response => {
                    console.log('Token exchange response status:', response.status)
                    const data = await response.json()
                    if (!response.ok) {
                        console.log('Token exchange error:', data)
                        if (data.error === 'invalid_grant') {
                            console.log('Invalid grant - likely a page refresh or reused code')
                            throw new Error('Authentication session expired. Please try logging in again.')
                        }
                        throw new Error(data.error_description || data.error || 'Failed to exchange code for token')
                    }
                    return data
                })
                .then(async data => {
                    if (!data || !data.access_token) {
                        throw new Error('No access token received from Spotify')
                    }

                    console.log('Successfully received access token')
                    localStorage.setItem('spotify_token', data.access_token)
                    setToken(data.access_token)

                    try {
                        // Get user profile from Spotify
                        console.log('Fetching user profile...')
                        const userResponse = await fetch('https://api.spotify.com/v1/me', {
                            headers: { 'Authorization': `Bearer ${data.access_token}` }
                        })

                        if (!userResponse.ok) {
                            throw new Error('Failed to fetch user profile from Spotify')
                        }

                        const userData = await userResponse.json()
                        console.log('Successfully fetched user profile:', userData.display_name)

                        // Save user to database and localStorage
                        const dbUser = await createOrUpdateUser(userData.display_name, userData.id)
                        localStorage.setItem('user_id', dbUser.id)
                        localStorage.setItem('username', userData.display_name)

                        // Get top tracks
                        console.log('Fetching top tracks from Spotify...')
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
                        console.log('Successfully fetched top tracks')

                        if (!tracksData.items?.length) {
                            console.log('No top tracks found in the last 4 weeks')
                            setError('No top tracks found in the last 4 weeks. Try listening to more music!')
                            return
                        }

                        const savedTracks = await saveUserTracks(dbUser.id, tracksData.items)
                        console.log('Tracks saved successfully:', savedTracks)

                        queryClient.setQueryData(['tracks', dbUser.id], savedTracks)
                        setUserId(dbUser.id)
                        await queryClient.invalidateQueries({ queryKey: ['all-user-tracks'] })
                    } catch (error) {
                        console.error('Error during data fetching:', error)
                        throw error
                    }
                })
                .catch(error => {
                    console.error('Authentication error:', error)
                    setError(`Authentication failed: ${error.message}`)
                    handleLogout() // Clean up any partial state on error
                })
                .finally(() => {
                    localStorage.removeItem('verifier')
                    setIsLoading(false)
                })
        }
    }, [queryClient])

    const handleLogin = async () => {
        try {
            const verifier = generateCodeVerifier(128)
            console.log('Generated verifier length:', verifier.length)

            const challenge = await generateCodeChallenge(verifier)
            console.log('Generated challenge length:', challenge.length)

            localStorage.setItem('verifier', verifier)
            console.log('Stored verifier in localStorage')

            const params = new URLSearchParams()
            params.append("client_id", import.meta.env.VITE_SPOTIFY_CLIENT_ID)
            params.append("response_type", "code")
            params.append("redirect_uri", import.meta.env.VITE_REDIRECT_URI)
            params.append("scope", "user-top-read")
            params.append("code_challenge_method", "S256")
            params.append("code_challenge", challenge)

            const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`
            console.log('Starting Spotify authorization...')
            window.location.href = authUrl
        } catch (error) {
            console.error('Error during login setup:', error)
            setError('Failed to initialize login. Please try again.')
        }
    }

    const handleLogout = () => {
        // Clear all stored data
        localStorage.removeItem('spotify_token')
        localStorage.removeItem('user_id')
        localStorage.removeItem('username')
        localStorage.removeItem('verifier')

        // Clear state
        setToken(null)
        setUserId(null)
        setError(null)

        // Clear query cache
        queryClient.clear()
    }

    return (
        <div className="app-container">
            <header>
                <div className="footer-text-container">
                    <div className="footer-link" onClick={() => window.location.reload()}>
                        <h2 className="metallic-text" data-text="Friendify">Friendify</h2>
                    </div>
                    <div className="creator-container">
                        <a href="https://www.limchayseng.com/" target="_blank" rel="noopener noreferrer" className="footer-link">
                            <span className="creator-text">by Ethan</span>
                        </a>
                        <img src="/images/skull-ethan-logo.png" alt="Ethan's skull logo" className="creator-logo" />
                    </div>
                </div>
                {!token && !isLoading && (
                    <button onClick={handleLogin}>
                        Connect with Spotify
                    </button>
                )}
                {token && (
                    <button onClick={handleLogout}>Logout</button>
                )}
            </header>
            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}
            <main>
                {isLoading ? (
                    <div>Connecting to Spotify...</div>
                ) : token ? (
                    <ErrorBoundary>
                        <TopTracks token={token} userId={userId} />
                    </ErrorBoundary>
                ) : (
                    <div className="landing-message">
                        <p>✨ Please connect with Spotify to see everyone's top tracks ✨</p>
                    </div>
                )}
            </main>
        </div>
    )
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AppContent />
        </QueryClientProvider>
    )
}

export default App
