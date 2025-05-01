import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppContent from './components/AppContent'
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

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AppContent />
        </QueryClientProvider>
    )
}

export default App
