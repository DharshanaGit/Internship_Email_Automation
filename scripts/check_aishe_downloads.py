import asyncio
from playwright.async_api import async_playwright

async def find_downloads():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(ignore_https_errors=True)
        await page.goto("https://dashboard.aishe.gov.in/hedirectory/#/hedirectory", timeout=40000, wait_until="networkidle")
        await page.wait_for_timeout(3000)

        # Look for download or export elements
        links = await page.query_selector_all("a[download], button:has-text('Export'), button:has-text('Download'), i.fa-download, i.fa-file-excel-o, i.fa-file-pdf-o")
        print(f"Download/Export triggers found: {len(links)}")
        for l in links:
            txt = await l.inner_text()
            href = await l.get_attribute("href")
            print("  Export trigger:", txt, href)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(find_downloads())
