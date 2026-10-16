import asyncio
from playwright.async_api import async_playwright

async def test_routes():
    routes = [
        "/AffiliationDegreeProgramDetailsReport",
        "/PrivateAndPublicUniversitiesProgramsReport",
        "/EapcetInstProfile",
        "/InstituteProfile",
        "/EDCETInstProfile",
        "/IcetInstProfile"
    ]

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(ignore_https_errors=True)
        page = await context.new_page()

        for r in routes:
            url = f"https://cap.apcfss.in{r}"
            print(f"\nNavigating to {url} ...")
            try:
                await page.goto(url, timeout=30000)
                await asyncio.sleep(4)
                title = await page.title()
                h1_h3 = await page.evaluate('''() => {
                    return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, table, select')).map(el => ({
                        tag: el.tagName,
                        text: el.innerText ? el.innerText.trim().slice(0, 80) : '',
                        id: el.id,
                        className: el.className
                    }));
                }''')
                print(f"  Title: {title}")
                print(f"  Elements found: {len(h1_h3)}")
                for el in h1_h3[:8]:
                    print(f"    <{el['tag']}> {el['text']} (id={el['id']})")
                
                # Check for tables
                tables = await page.query_selector_all('table')
                print(f"  Tables on page: {len(tables)}")
                if tables:
                    rows = await page.evaluate('''() => {
                        const trs = document.querySelectorAll('table tr');
                        return Array.from(trs).slice(0, 5).map(tr => Array.from(tr.querySelectorAll('th, td')).map(td => td.innerText.trim()));
                    }''')
                    print(f"  First 3 table rows:")
                    for row in rows[:3]:
                        print("    ", row[:8])
            except Exception as e:
                print(f"  Error loading {r}: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_routes())
