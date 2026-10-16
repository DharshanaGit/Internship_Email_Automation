import asyncio
import json
from playwright.async_api import async_playwright

async def intercept_apis():
    routes = [
        "/InstituteProfile",
        "/EapcetInstProfile",
        "/AffiliationDegreeProgramDetailsReport",
        "/IcetInstProfile",
        "/LawCetInstProfile",
        "/EDCETInstProfile",
        "/ECETPharmacyInstProfile",
        "/PgcetInstProfile",
        "/PgecetInstProfile",
        "/BarchInstProfile"
    ]

    api_endpoints_found = {}

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(ignore_https_errors=True)
        page = await context.new_page()

        async def handle_response(response):
            url = response.url
            if any(k in url for k in ['api', 'affiliation', 'oam', 'college', 'inst', 'list']):
                ct = response.headers.get('content-type', '')
                if 'json' in ct:
                    try:
                        data = await response.json()
                        length = len(data) if isinstance(data, list) else len(data.keys())
                        sample_item = data[0] if isinstance(data, list) and len(data) > 0 else (list(data.items())[:2] if isinstance(data, dict) else None)
                        api_endpoints_found[url] = {
                            'length': length,
                            'type': str(type(data)),
                            'sample_keys': list(data[0].keys()) if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict) else None,
                            'sample_item': sample_item
                        }
                    except Exception:
                        pass

        page.on("response", handle_response)

        for r in routes:
            url = f"https://cap.apcfss.in{r}"
            print(f"Visiting {url} ...")
            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
                await asyncio.sleep(2)
            except Exception as e:
                print(f"Error visiting {r}: {e}")

        await browser.close()

    print("\n" + "=" * 80)
    print("ALL API ENDPOINTS INTERCEPTED BY PLAYWRIGHT:")
    print("=" * 80)
    for url, info in api_endpoints_found.items():
        print(f"\nAPI URL: {url}")
        print(f"  Total items: {info['length']}")
        print(f"  Sample keys: {info['sample_keys']}")
        if info['sample_item']:
            print(f"  Sample item preview: {str(info['sample_item'])[:300]}...")

    with open("data/intercepted_cap_apis.json", "w", encoding="utf-8") as f:
        json.dump(api_endpoints_found, f, indent=2, ensure_ascii=False)
    print("\nSaved intercepted API metadata to data/intercepted_cap_apis.json")

if __name__ == "__main__":
    asyncio.run(intercept_apis())
