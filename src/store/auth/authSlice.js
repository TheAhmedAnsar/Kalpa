import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  user: null,
  accessToken: null,
  sessionExpiresAt: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, { payload }) => {
      state.user = payload.user
      state.accessToken = payload.accessToken
      state.sessionExpiresAt = payload.sessionExpiresAt || null
    },
    tokenRefreshed: (state, { payload }) => {
      state.accessToken = payload.accessToken
      if (payload.sessionExpiresAt) state.sessionExpiresAt = payload.sessionExpiresAt
    },
    setUser: (state, { payload }) => { state.user = payload },
    logout: () => ({ ...initialState })
  }
})

export const { loginSuccess, tokenRefreshed, setUser, logout } = authSlice.actions;
export default authSlice.reducer;