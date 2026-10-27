import asyncio
import json
from playwright.async_api import async_playwright

async def explore_hedirectory_navigation():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(ignore_https_errors=True)

        intercepted = []
        page.on("response", lambda r: intercepted.append({"url": r.url, "status": r.status}) if any(k in r.url.lower() for k in ["aishe", "nic.in"]) and not any(r.url.endswith(e) for e in [".js", ".css", ".png", ".jpg", ".svg", ".woff2"]) else None)

        print("Navigating to AISHE HE Directory...")
        await page.goto("https://dashboard.aishe.gov.in/hedirectory/#/hedirectory", timeout=40000, wait_until="networkidle")
        await page.wait_for_timeout(3000)

        # Print all clickable tabs and links
        buttons = await page.query_selector_all("a, button, [role='tab'], select")
        print(f"Total interactive elements: {len(buttons)}")
        
        tab_names = []
        for b in buttons:
            txt = (await b.inner_text()).strip()
            if txt and len(txt) < 50:
                tab_names.append(txt)
        print("Tab/Button labels:", tab_names[:25])

        # Click on tabs matching College or Standalone
        for b in buttons:
            txt = (await b.inner_text()).strip()
            if any(term in txt.lower() for term in ["college", "standalone", "state", "all india"]):
                print(f"Clicking: {txt}...")
                try:
                    await b.click()
                    await page.wait_for_timeout(3000)
                except Exception as e:
                    print(f"Could not click {txt}: {e}")

        print("\nAll Intercepted Backend Calls:")
        for it in intercepted:
            print(f"  {it['status']} {it['url']}")

        with open("scripts/hedirectory_all_calls.json", "w") as f:
            json.dump(intercepted, f, indent=2)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(explore_hedirectory_navigation())
