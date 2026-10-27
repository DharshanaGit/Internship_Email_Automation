import asyncio
import json
from playwright.async_api import async_playwright

async def run():
    print("[AISHE Inspector] Launching headless browser...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            ignore_https_errors=True
        )
        page = await context.new_page()

        api_calls = []

        async def handle_response(response):
            url = response.url
            if any(term in url.lower() for term in ["api", "json", "hedirectory", "get", "college", "state", "district"]):
                try:
                    ct = response.headers.get("content-type", "")
                    if "json" in ct:
                        data = await response.json()
                        api_calls.append({"url": url, "status": response.status, "data_preview": str(data)[:300]})
                        print(f"INTERCEPTED JSON API: {url} -> Status {response.status}")
                except Exception:
                    pass

        page.on("response", handle_response)

        print("[AISHE Inspector] Navigating to https://dashboard.aishe.gov.in/hedirectory/#/hedirectory ...")
        try:
            await page.goto("https://dashboard.aishe.gov.in/hedirectory/#/hedirectory", timeout=45000, wait_until="networkidle")
            await page.wait_for_timeout(5000)
            
            title = await page.title()
            print(f"[AISHE Inspector] Page Title: {title}")

            # Take screenshot for confirmation
            await page.screenshot(path="public/aishe_dashboard_screenshot.png")
            print("[AISHE Inspector] Screenshot saved to public/aishe_dashboard_screenshot.png")

            # Look for select dropdowns or tabs
            dropdowns = await page.query_selector_all("select, mat-select, .dropdown, button")
            print(f"[AISHE Inspector] Found {len(dropdowns)} interactive elements on dashboard.")

            # Save intercepted API calls
            with open("scripts/aishe_intercepted_apis.json", "w", encoding="utf-8") as f:
                json.dump(api_calls, f, indent=2)
            print(f"[AISHE Inspector] Saved {len(api_calls)} intercepted API calls to scripts/aishe_intercepted_apis.json")

        except Exception as e:
            print(f"[AISHE Inspector] Navigation error: {e}")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
