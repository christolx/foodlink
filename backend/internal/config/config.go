package config

import "os"

type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
}

func Load() Config {
	cfg := Config{
		Port:        os.Getenv("PORT"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		JWTSecret:   os.Getenv("DEMO_JWT_SECRET"),
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = "foodlink-local-demo-secret"
	}
	return cfg
}
