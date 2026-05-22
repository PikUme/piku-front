import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getServerURL } from '@/lib/utils/url';
import { AuthStatus, User } from '@/types/auth';
import { AUTH_TOKEN_KEY } from '@/lib/constants';

interface AuthState {
  authStatus: AuthStatus;
  isLoggedIn: boolean;
  user: User | null;

  login: (user: User) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

let authCheckPromise: Promise<void> | null = null;

const normalizeUser = (user: User): User => {
  const rawAvatar = user.avatar || (user as any).avatarUrl || '';
  const avatar = rawAvatar && !rawAvatar.startsWith('http')
    ? `${getServerURL()}/${rawAvatar}`
    : rawAvatar;

  return { ...user, avatar };
};

const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      authStatus: 'checking',
      isLoggedIn: false,
      user: null,

      login: (user) => {
        set({
          authStatus: 'authenticated',
          isLoggedIn: true,
          user: normalizeUser(user),
        });
      },
      logout: () => {
        set({ authStatus: 'anonymous', isLoggedIn: false, user: null });
        if (typeof window !== 'undefined') {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
      },
      checkAuth: async () => {
        // persist 미들웨어가 accessToken을 localStorage에서 로드한 후 호출되어야 함.
        // (onRehydrateStorage 콜백을 통해)
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem(AUTH_TOKEN_KEY); // 스토어의 현재 accessToken
          const user = get().user;
          if (token && user) {
            set({ authStatus: 'authenticated', isLoggedIn: true });
            // refreshToken은 HttpOnly이므로 클라이언트에서 읽거나 설정하지 않음.
            // 로그인 시 스토어에 저장했던 refreshToken은 페이지 새로고침 후에는 null일 수 있음.
            return;
          }

          if (!token) {
            set({ authStatus: 'anonymous', isLoggedIn: false, user: null });
            return;
          }

          if (authCheckPromise) {
            return authCheckPromise;
          }

          set({ authStatus: 'checking' });
          authCheckPromise = (async () => {
            try {
              const { getCurrentUser } = await import('@/lib/api/auth');
              const currentUser = await getCurrentUser();
              set({
                authStatus: 'authenticated',
                isLoggedIn: true,
                user: normalizeUser(currentUser),
              });
            } catch {
              localStorage.removeItem(AUTH_TOKEN_KEY);
              set({ authStatus: 'anonymous', isLoggedIn: false, user: null });
            } finally {
              authCheckPromise = null;
            }
          })();

          return authCheckPromise;
        }
      }
    }),
    {
      name: 'auth-storage', // 로컬 스토리지에 저장될 때 사용될 키 이름
      storage: createJSONStorage(() => localStorage), // accessToken은 localStorage에 저장
      // refreshToken은 persist 대상에서 제외 (HttpOnly 쿠키로 관리된다고 가정)
      partialize: (state) => ({ isLoggedIn: state.isLoggedIn, user: state.user }),
      // persist된 스토리지로부터 상태가 성공적으로 복원(rehydrated)된 후에 checkAuth를 호출.
      onRehydrateStorage: () => {
        return (state, error) => {
          if (state && typeof window !== 'undefined') {
            state.checkAuth();
          } else if (error) {
            console.error("Failed to rehydrate auth store", error);
          }
        };
      },
    }
  )
);

export default useAuthStore;
