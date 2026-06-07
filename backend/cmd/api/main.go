package main

import (
	"flag"
	"log"
	"net/http"

	"foodlink-be/internal/config"
	"foodlink-be/internal/db"
	"foodlink-be/internal/server"
	"foodlink-be/internal/store"
)

func main() {
	runMigrate := flag.Bool("migrate", false, "run database migrations and seed demo data")
	cleanupSmoke := flag.Bool("cleanup-smoke", false, "delete smoke test records")
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
		Handler: server.Handler(st, cfg.JWTSecret),
	}

	log.Printf("FoodLink API listening on :%s", cfg.Port)
	if err := apiServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}
