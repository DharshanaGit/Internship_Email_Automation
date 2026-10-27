import httpx
import re
import urllib.parse
from datetime import datetime
import duckdb
from automation_engine.config import BRAVE_API_KEY, DUCKDB_PATH, USER_AGENT, REQUEST_TIMEOUT

AGGREGATOR_BLACKLIST = {
    "shiksha.com", "collegedunia.com", "careers360.com", "justdial.com",
    "wikipedia.org", "getmyuni.com", "facebook.com", "linkedin.com",
    "youtube.com", "twitter.com", "instagram.com", "indiamart.com",
    "targetadmission.com", "collegedekho.com", "jagranjosh.com"
}

class MissingWebsiteResolver:
    def __init__(self):
        self.headers = {"User-Agent": USER_AGENT}
        if BRAVE_API_KEY:
            self.headers["X-Subscription-Token"] = BRAVE_API_KEY
            self.headers["Accept"] = "application/json"
        
        self.client = httpx.Client(timeout=REQUEST_TIMEOUT, verify=False, follow_redirects=True)
        self._init_duckdb()

    def _init_duckdb(self):
        """Initializes DuckDB evidence audit store."""
        conn = duckdb.connect(DUCKDB_PATH)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS domain_evidence (
                college_id VARCHAR,
                college_name VARCHAR,
                searched_query VARCHAR,
                candidate_url VARCHAR,
                candidate_domain VARCHAR,
                http_status INTEGER,
                matching_score DOUBLE,
                is_verified BOOLEAN,
                verified_at TIMESTAMP
            );
        """)
        conn.close()

    def resolve_website(self, college_id, college_name, district, state):
        """
        Discovers official website using Brave Search API & domain-matching rule evidence.
        Logs evidence into DuckDB.
        """
        query = f'"{college_name}" {district} {state} official website'
        print(f"[Website Resolver] Searching verified domain for: {college_name}...")

        candidate_urls = []
        if BRAVE_API_KEY:
            try:
                resp = self.client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    params={"q": query, "count": 10},
                    headers=self.headers
                )
                if resp.status_code == 200:
                    results = resp.json().get("web", {}).get("results", [])
                    for r in results:
                        u = r.get("url")
                        if u:
                            candidate_urls.append(u)
            except Exception as e:
                print(f"[Brave Search API] Notice: {e}")

        # Fallback to direct heuristic search if Brave API key not configured or returned 0
        if not candidate_urls:
            try:
                search_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"
                resp = self.client.get(search_url, headers=self.headers)
                if resp.status_code == 200:
                    for href in re.findall(r'uddg=([^&]+)', resp.text):
                        decoded = urllib.parse.unquote(href)
                        if decoded.startswith("http"):
                            candidate_urls.append(decoded)
            except Exception as e:
                print(f"[Search Engine Fallback] Notice: {e}")

        # Evaluate candidate URLs against Python domain-matching rules
        best_url = None
        best_score = 0.0

        for url in candidate_urls:
            parsed = urllib.parse.urlparse(url)
            domain = parsed.netloc.lower()
            if domain.startswith("www."):
                domain = domain[4:]

            # Reject aggregators and social media
            if any(agg in domain for agg in AGGREGATOR_BLACKLIST):
                continue

            # Calculate Domain-Matching Evidence Score
            score = 0.0
            # Higher education TLD bonus
            if domain.endswith(".ac.in") or domain.endswith(".edu.in") or domain.endswith(".res.in"):
                score += 0.50
            elif domain.endswith(".org") or domain.endswith(".edu"):
                score += 0.30

            # Token overlap with college name
            tokens = [t.lower() for t in re.findall(r'[a-zA-Z]{3,}', college_name)]
            match_count = sum(1 for t in tokens if t in domain)
            if tokens:
                score += (match_count / len(tokens)) * 0.40

            # District presence
            if district and district.lower() in domain:
                score += 0.10

            # Live HTTP verification test (no dead links)
            http_status = 0
            is_active = False
            if score >= 0.35:
                try:
                    head_resp = self.client.head(url, timeout=6.0)
                    http_status = head_resp.status_code
                    if http_status in (200, 301, 302, 308):
                        is_active = True
                except Exception:
                    try:
                        get_resp = self.client.get(url, timeout=6.0)
                        http_status = get_resp.status_code
                        if http_status == 200:
                            is_active = True
                    except Exception:
                        is_active = False

            # Log evidence into DuckDB
            try:
                duck_conn = duckdb.connect(DUCKDB_PATH)
                duck_conn.execute("""
                    INSERT INTO domain_evidence VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, (
                    str(college_id), college_name, query, url, domain,
                    http_status, float(score), is_active and score >= 0.40, datetime.now()
                ))
                duck_conn.close()
            except Exception as e:
                pass

            if is_active and score > best_score and score >= 0.40:
                best_score = score
                best_url = f"{parsed.scheme}://{parsed.netloc}"

        if best_url:
            print(f"[Website Resolver] Successfully verified domain: {best_url} (Evidence Score: {best_score:.2f})")
            return best_url, True

        return None, False

    def close(self):
        self.client.close()
