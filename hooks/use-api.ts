'use client'

import { useState, useEffect } from 'react'

interface FetchOptions {
  userId?: string | number
  [key: string]: any
}

export function useFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const url = new URL(endpoint, typeof window !== 'undefined' ? window.location.origin : '')

      // Add query parameters
      Object.entries(options).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value))
        }
      })

      const response = await fetch(url.toString())

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [endpoint])

  const refetch = () => {
    fetchData()
  }

  return { data, isLoading, error, refetch }
}

export function usePost<T>(endpoint: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const post = async (payload: any): Promise<T | null> => {
    // Prevent duplicate requests
    if (isLoading) {
      throw new Error('Request already in progress')
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to post: ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { post, isLoading, error }
}

export function useDelete(endpoint: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteItem = async (id: string | number): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${endpoint}/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to delete: ${response.statusText}`)
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { deleteItem, isLoading, error }
}

export function usePut(endpoint: string) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const put = async (id: string | number, data: any): Promise<any> => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${endpoint}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to update: ${response.statusText}`)
      }

      const result = await response.json()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { put, isLoading, error }
}
