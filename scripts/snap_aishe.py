import asyncio
from playwright.async_api import async_playwright

async def snap():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(ignore_https_errors=True)
        await page.goto("https://dashboard.aishe.gov.in/hedirectory/#/hedirectory", timeout=40000, wait_until="networkidle")
        await page.wait_for_timeout(3000)
        
        # Click Colleges
        colleges_tab = await page.query_selector("text=COLLEGES")
        if colleges_tab:
            await colleges_tab.click()
            await page.wait_for_timeout(3000)
            
        await page.screenshot(path="public/aishe_colleges_tab.png")
        print("Screenshot saved to public/aishe_colleges_tab.png")
        
        # Look for buttons or cards
        text = await page.inner_text("body")
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        print("Page text snippet (50 lines):")
        for l in lines[:50]:
            print("  ", l)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(snap())
