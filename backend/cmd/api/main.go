package main

import (
	"flag"
	"foodlink-be/internal/config"
	"foodlink-be/internal/db"
	"foodlink-be/internal/server"
	"foodlink-be/internal/store"
	"log"
	"net/http"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Print("No .env loaded.")
	}

	runMigrate := flag.Bool("migrate", false, "run database migrations and seed demo data")
	cleanupSmoke := flag.Bool("cleanup-smoke", false, "delete smoke test records")
	runNuke := flag.Bool("nuke", false, "drop all database tables (can be combined with --migrate)")
	flag.Parse()

	cfg := config.Load()
	if cfg.DatabaseURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	conn, err := db.Open(cfg.DatabaseURL)
	if err != nil {
		log.Fatal(err)
	}
	st := store.New(conn)

	if *runNuke {
		if err := st.NukeDatabase(); err != nil {
			log.Fatal(err)
		}
		log.Print("database nuked")
		if !*runMigrate {
			return
		}
	}

	if *runMigrate {
		if err := st.AutoMigrate(); err != nil {
			log.Fatal(err)
		}
		if err := st.SeedDemoData(); err != nil {
			log.Fatal(err)
		}
		log.Print("database migrated and demo data seeded")
		return
	}
	if *cleanupSmoke {
		if err := st.CleanupSmokeData(); err != nil {
			log.Fatal(err)
		}
		log.Print("smoke test data cleaned")
		return
	}

	apiServer := &http.Server{
		Addr:    ":" + cfg.Port,
		Handler: server.HandlerWithOptions(st, cfg.JWTSecret, server.Options{AllowedOrigins: cfg.AllowedOrigins}),
	}

	log.Printf("FoodLink API listening on :%s", cfg.Port)
	if err := apiServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
