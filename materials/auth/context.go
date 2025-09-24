package auth

import "context"

type contextKey string

const userContextKey contextKey = "user"

// WithUser adds user to context
func WithUser(ctx context.Context, user *CASUser) context.Context {
	return context.WithValue(ctx, userContextKey, user)
}

// UserFromContext retrieves user from context
func UserFromContext(ctx context.Context) *CASUser {
	user, ok := ctx.Value(userContextKey).(*CASUser)
	if !ok {
		return nil
	}
	return user
}
