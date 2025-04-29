import { createContext, useContext, useState } from 'react'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [activeUsers, setActiveUsers] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)

  const addUser = (userData) => {
    setActiveUsers(prev => {
      // Check if user already exists
      if (prev.some(user => user.id === userData.id)) {
        return prev
      }
      return [...prev, userData]
    })
    setCurrentUserId(userData.id)
  }

  const removeUser = (userId) => {
    setActiveUsers(prev => prev.filter(user => user.id !== userId))
    if (currentUserId === userId) {
      setCurrentUserId(activeUsers[0]?.id || null)
    }
  }

  const switchUser = (userId) => {
    if (activeUsers.some(user => user.id === userId)) {
      setCurrentUserId(userId)
    }
  }

  return (
    <UserContext.Provider value={{
      activeUsers,
      currentUserId,
      addUser,
      removeUser,
      switchUser
    }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext) 