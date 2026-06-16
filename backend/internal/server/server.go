package server

import (
	"net/http"
	"strings"

	"foodlink-be/internal/api"
	"foodlink-be/internal/store"
)

type Server struct {
	store     *store.Store
	jwtSecret []byte
}

type Options struct {
	AllowedOrigins []string
}

func New(st *store.Store, jwtSecret string) *Server {
	return &Server{store: st, jwtSecret: []byte(jwtSecret)}
}

func Handler(st *store.Store, jwtSecret string) http.Handler {
	return HandlerWithOptions(st, jwtSecret, Options{
		AllowedOrigins: []string{"http://localhost:3000", "http://127.0.0.1:3000"},
	})
}

func HandlerWithOptions(st *store.Store, jwtSecret string, opts Options) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	strict := api.NewStrictHandlerWithOptions(
		New(st, jwtSecret),
		[]api.StrictMiddlewareFunc{authMiddleware(jwtSecret)},
		api.StrictHTTPServerOptions{
			RequestErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
				writeJSON(w, http.StatusBadRequest, api.ErrorResponse{Code: "bad_request", Message: err.Error()})
			},
			ResponseErrorHandlerFunc: func(w http.ResponseWriter, r *http.Request, err error) {
				writeJSON(w, http.StatusInternalServerError, api.ErrorResponse{Code: "internal_error", Message: err.Error()})
			},
		},
	)
	return corsMiddleware(api.HandlerFromMuxWithBaseURL(strict, mux, "/api/v1"), opts.AllowedOrigins)
}

func corsMiddleware(next http.Handler, allowedOrigins []string) http.Handler {
	allowed := make(map[string]struct{}, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			allowed[origin] = struct{}{}
		}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if _, ok := allowed[origin]; ok {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Add("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
