import asyncio
from playwright.async_api import async_playwright

async def explore_cap():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(ignore_https_errors=True)
        page = await context.new_page()

        print("Navigating to https://cap.apcfss.in/ ...")
        await page.goto("https://cap.apcfss.in/", timeout=60000)
        
        # Wait a few seconds for any client-side redirects
        await asyncio.sleep(5)
        print("Current URL after redirect:", page.url)
        print("Page Title:", await page.title())

        # Screenshot
        await page.screenshot(path="cap_homepage.png", full_page=True)
        print("Screenshot saved to cap_homepage.png")

        # Extract all buttons and links
        elements = await page.query_selector_all('a, button, li, .nav-item, .dropdown-item')
        print(f"Found {len(elements)} elements.")
        
        menu_items = []
        for el in elements:
            txt = (await el.inner_text()).strip()
            href = await el.get_attribute('href')
            if txt and len(txt) < 80:
                menu_items.append((txt, href))

        print("\nDistinct menu / button items:")
        seen = set()
        for txt, href in menu_items:
            key = (txt, href)
            if key not in seen:
                seen.add(key)
                print(f"  {txt} -> {href}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(explore_cap())
