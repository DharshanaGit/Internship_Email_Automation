import os
from pathlib import Path
from dotenv import load_dotenv

# Load local environment files
ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env.local")
load_dotenv(ROOT_DIR / ".env")

# PostgreSQL Configuration
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "127.0.0.1")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
POSTGRES_DB = os.getenv("POSTGRES_DB", "college_directory")
POSTGRES_USER = os.getenv("POSTGRES_USER", "college_bot")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "MySecurePass123!")

# Brave Search API Key (for finding missing official college websites)
BRAVE_API_KEY = os.getenv("BRAVE_API_KEY", "")

# OpenAI API Key (for Structured Output extraction & role classification)
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# DuckDB Path for storing domain evidence & audit logs
DUCKDB_PATH = os.getenv("DUCKDB_PATH", str(ROOT_DIR / "data" / "evidence.duckdb"))

# Celery & Redis Configuration (for monthly background jobs)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Scraper & Crawler Settings
REQUEST_TIMEOUT = 15
MAX_CONCURRENT_REQUESTS = 10
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
