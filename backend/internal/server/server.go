package server

import (
	"net/http"
	"strings"

	"foodlink-be/internal/api"
	"foodlink-be/internal/auth"
	"foodlink-be/internal/chat"
	"foodlink-be/internal/dashboard"
	"foodlink-be/internal/donations"
	"foodlink-be/internal/notifications"
	"foodlink-be/internal/pickups"
	"foodlink-be/internal/profiles"
	"foodlink-be/internal/proposals"
	"foodlink-be/internal/store"
)

type Server struct {
	auth          *auth.Service
	chat          *chat.Service
	donations     *donations.Service
	notifications *notifications.Service
	pickups       *pickups.Service
	profiles      *profiles.Service
	proposals     *proposals.Service
	dashboard     *dashboard.Presenter
	*donationsHTTPHandler
	*authHTTPHandler
	*profilesHTTPHandler
	*notificationsHTTPHandler
	*pickupsHTTPHandler
	*proposalsHTTPHandler
	*chatHTTPHandler
	jwtSecret []byte
}

type donationsHTTPHandler = donations.HTTPHandler
type authHTTPHandler = auth.HTTPHandler
type profilesHTTPHandler = profiles.HTTPHandler
type notificationsHTTPHandler = notifications.HTTPHandler
type pickupsHTTPHandler = pickups.HTTPHandler
type proposalsHTTPHandler = proposals.HTTPHandler
type chatHTTPHandler = chat.HTTPHandler

type Options struct {
	AllowedOrigins []string
}

func New(st *store.Store, jwtSecret string) *Server {
	srv := &Server{
		auth:          auth.New(st),
		chat:          chat.New(st),
		donations:     donations.New(st),
		notifications: notifications.New(st),
		pickups:       pickups.New(st),
		profiles:      profiles.New(st),
		proposals:     proposals.New(st),
		dashboard:     dashboard.New(st),
		jwtSecret:     []byte(jwtSecret),
	}
	srv.donationsHTTPHandler = donations.NewHTTPHandler(srv.donations, srv.authUser)
	srv.authHTTPHandler = auth.NewHTTPHandler(srv.auth, srv.signToken)
	srv.profilesHTTPHandler = profiles.NewHTTPHandler(srv.profiles, srv.authUser)
	srv.notificationsHTTPHandler = notifications.NewHTTPHandler(srv.notifications, srv.authUser)
	srv.pickupsHTTPHandler = pickups.NewHTTPHandler(srv.pickups, srv.authUser, srv.dashboard)
	srv.proposalsHTTPHandler = proposals.NewHTTPHandler(srv.proposals, srv.authUser, srv.dashboard)
	srv.chatHTTPHandler = chat.NewHTTPHandler(srv.chat, authUserID, func(token string) (string, error) { return parseBearer("Bearer "+token, srv.jwtSecret) })
	return srv
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
	srv := New(st, jwtSecret)

	strict := api.NewStrictHandlerWithOptions(
		srv,
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
	return corsMiddleware(sseFlushMiddleware(api.HandlerFromMuxWithBaseURL(strict, mux, "/api/v1")), opts.AllowedOrigins)
}

type sseResponseWriter struct {
	http.ResponseWriter
	streaming bool
}

func (w *sseResponseWriter) WriteHeader(statusCode int) {
	w.streaming = strings.HasPrefix(w.Header().Get("Content-Type"), "text/event-stream")
	w.ResponseWriter.WriteHeader(statusCode)
	if w.streaming {
		w.flush()
	}
}

func (w *sseResponseWriter) Write(value []byte) (int, error) {
	written, err := w.ResponseWriter.Write(value)
	if w.streaming {
		w.flush()
	}
	return written, err
}

func (w *sseResponseWriter) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

func (w *sseResponseWriter) flush() {
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

func sseFlushMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(&sseResponseWriter{ResponseWriter: w}, r)
	})
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
			w.Header().Set("Access-Control-Allow-Methods", "GET,POST,PUT,OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
