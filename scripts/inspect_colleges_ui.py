import asyncio
from playwright.async_api import async_playwright

async def inspect_colleges_ui():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(ignore_https_errors=True)

        print("Navigating to AISHE HE Directory...")
        await page.goto("https://dashboard.aishe.gov.in/hedirectory/#/hedirectory", timeout=45000, wait_until="networkidle")
        await page.wait_for_timeout(3000)

        # Click on COLLEGES button/tab
        colleges_tab = await page.query_selector("text=COLLEGES")
        if colleges_tab:
            print("Found COLLEGES tab, clicking...")
            await colleges_tab.click()
            await page.wait_for_timeout(3000)

        # Look at rendered selects
        selects = await page.query_selector_all("select")
        print(f"Total <select> elements: {len(selects)}")
        for idx, s in enumerate(selects):
            opts = await s.query_selector_all("option")
            print(f"Select #{idx}: {len(opts)} options. First few:")
            for opt in opts[:5]:
                print("   ", (await opt.inner_text()).strip())

        # Check tables or data containers
        tables = await page.query_selector_all("table")
        print(f"Total tables rendered: {len(tables)}")
        for t in tables:
            headers = [await th.inner_text() for th in await t.query_selector_all("th")]
            print("Table headers:", headers[:8])
            rows = await t.query_selector_all("tbody tr")
            print("Table rows:", len(rows))

        await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect_colleges_ui())
