import { configureStore } from "@reduxjs/toolkit";
import { api } from "./api";
import authReducer from "./slices/authSlice";
import queueReducer from "./slices/queueSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    queue: queueReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;