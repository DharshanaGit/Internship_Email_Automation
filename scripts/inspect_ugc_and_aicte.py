import asyncio
import json
from playwright.async_api import async_playwright

async def inspect_url(name, url):
    print(f"\n--- Inspecting {name}: {url} ---")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(ignore_https_errors=True)
        page = await context.new_page()

        api_calls = []

        async def on_response(response):
            u = response.url
            if any(k in u.lower() for k in ["api", "json", "university", "college", "institute", "data", "get"]):
                try:
                    ct = response.headers.get("content-type", "")
                    if "json" in ct or "text" in ct:
                        api_calls.append({"url": u, "status": response.status})
                        print(f"[{name} API] {response.status} {u}")
                except Exception:
                    pass

        page.on("response", on_response)

        try:
            await page.goto(url, timeout=40000, wait_until="networkidle")
            await page.wait_for_timeout(4000)
            
            # Count tables, rows, links
            tables = await page.query_selector_all("table")
            print(f"[{name}] Rendered Tables: {len(tables)}")
            
            if tables:
                rows = await tables[0].query_selector_all("tr")
                print(f"[{name}] First table row count: {len(rows)}")
                if len(rows) > 1:
                    text = await rows[1].inner_text()
                    print(f"[{name}] Sample row text: {text.replace(chr(10), ' | ')[:150]}")

            # Check if there are cards or lists if no table
            cards = await page.query_selector_all(".card, .view-content, .university-list, .col-md-")
            print(f"[{name}] Interactive/Card elements: {len(cards)}")

        except Exception as e:
            print(f"[{name}] Navigation error: {e}")
        finally:
            await browser.close()

async def main():
    await inspect_url("AICTE", "https://www.aicte.gov.in/education/institutions/Universities")
    await inspect_url("UGC", "https://www.ugc.gov.in/universitydetails/")

if __name__ == "__main__":
    asyncio.run(main())
