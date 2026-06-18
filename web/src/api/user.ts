import request from '@/utils/request'
import type { User } from '@/types'

export const login = (username: string, password: string) => {
  return request.post<any, User>('/users/login', { username, password })
}

export const getUserById = (id: number) => {
  return request.get<any, User>(`/users/${id}`)
}

export const getAllUsers = () => {
  return request.get<any, User[]>('/users')
}
