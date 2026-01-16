export interface UserInfo {
    id: string;
    email: string;
    name: string;
    picture?: string;
}

export interface AuthService {
    /**
     * Initiates the login flow.
     * Returns the access token.
     */
    login(): Promise<string>;

    /**
     * Returns the current valid token, or null if not logged in.
     */
    getToken(): Promise<string | null>;

    /**
     * Fetches user profile info using the token.
     */
    getUserInfo(token: string): Promise<UserInfo>;

    /**
     * Logs out and invalidates token.
     */
    logout(): Promise<void>;
}
