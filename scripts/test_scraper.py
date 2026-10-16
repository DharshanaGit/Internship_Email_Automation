import aiohttp
import asyncio
import ssl
import re
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup

# Email regex
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')

# Common invalid extensions or domains
IGNORE_EXTS = {'.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js', '.pdf', '.docx', '.ico'}
IGNORE_DOMAINS = {'example.com', 'domain.com', 'yourdomain.com', 'w3.org', 'schema.org', 'sentry.io', 'google.com'}

def clean_email(email):
    email = email.strip().lower().rstrip('.')
    # remove trailing semicolons or commas
    email = re.sub(r'[,;:]+$', '', email)
    if any(email.endswith(ext) for ext in IGNORE_EXTS):
        return None
    domain = email.split('@')[-1]
    if domain in IGNORE_DOMAINS:
        return None
    if len(email) < 6 or len(domain) < 4 or '.' not in domain:
        return None
    return email

def detect_role_and_dept(text_context):
    t = text_context.lower()
    role = "Staff / Department Contact"
    dept = ""
    
    if "principal" in t:
        role = "Principal"
    elif "director" in t:
        role = "Director"
    elif "vice chancellor" in t or "vc" in t:
        role = "Vice Chancellor"
    elif "dean" in t:
        role = "Dean"
    elif "hod" in t or "head of the department" in t or "head of department" in t:
        role = "HOD (Head of Department)"
    elif "placement" in t or "tpo" in t or "training" in t:
        role = "Placement Officer / TPO"
    elif "coordinator" in t:
        role = "Faculty Coordinator"
    elif "professor" in t:
        role = "Professor / Faculty"
    elif "office" in t or "admin" in t or "registrar" in t:
        role = "Administrative Office / Registrar"

    # Detect department
    if "computer science" in t or "cse" in t:
        dept = "Computer Science & Engineering (CSE)"
    elif "information technology" in t or " it " in t:
        dept = "Information Technology (IT)"
    elif "electronics" in t or "ece" in t:
        dept = "Electronics & Communication (ECE)"
    elif "electrical" in t or "eee" in t:
        dept = "Electrical & Electronics (EEE)"
    elif "mechanical" in t or "mech" in t:
        dept = "Mechanical Engineering (MECH)"
    elif "civil" in t:
        dept = "Civil Engineering (CIVIL)"
    elif "pharmacy" in t or "b.pharm" in t or "m.pharm" in t:
        dept = "Pharmacy"
    elif "management" in t or "mba" in t:
        dept = "Management Studies (MBA)"
    elif "mca" in t or "computer application" in t:
        dept = "Computer Applications (MCA)"
    elif "humanities" in t or "science" in t:
        dept = "Basic Sciences & Humanities"
        
    return role, dept

async def scrape_college_site(session, site_url):
    results = []
    if not site_url or site_url.lower() in ['na', 'null', 'nil', '-']:
        return results

    if not site_url.startswith('http'):
        site_url = 'http://' + site_url

    parsed_base = urlparse(site_url)
    base_domain = parsed_base.netloc.lower().replace('www.', '')

    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }

    visited = set()
    to_visit = [site_url]

    # Target pages
    target_subpaths = [
        '/contact', '/contact-us', '/contactus', '/contactus.php', '/contact.html',
        '/faculty', '/about-us', '/administration', '/departments'
    ]
    for sub in target_subpaths:
        to_visit.append(urljoin(site_url, sub))

    for url in to_visit[:5]: # Crawl up to 5 contact/faculty pages per site
        if url in visited:
            continue
        visited.add(url)
        try:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=8), allow_redirects=True) as resp:
                if resp.status != 200:
                    continue
                html = await resp.text(errors='ignore')
                soup = BeautifulSoup(html, 'html.parser')
                
                # Search mailto links first
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if href.startswith('mailto:'):
                        raw_email = href.replace('mailto:', '').split('?')[0]
                        clean_e = clean_email(raw_email)
                        if clean_e:
                            parent_text = a.parent.get_text(separator=' ', strip=True) if a.parent else ""
                            role, dept = detect_role_and_dept(parent_text)
                            results.append({
                                'email': clean_e,
                                'role': role,
                                'department': dept,
                                'source_page': url
                            })

                # Search regex text
                text_content = soup.get_text(separator=' ', strip=True)
                found_emails = EMAIL_REGEX.findall(text_content)
                for raw_e in set(found_emails):
                    clean_e = clean_email(raw_e)
                    if clean_e and not any(r['email'] == clean_e for r in results):
                        # Find context snippet around the email in text
                        idx = text_content.find(raw_e)
                        snippet = text_content[max(0, idx-60):min(len(text_content), idx+60)]
                        role, dept = detect_role_and_dept(snippet)
                        results.append({
                            'email': clean_e,
                            'role': role,
                            'department': dept,
                            'source_page': url
                        })
        except Exception:
            continue

    return results

async def test_sample():
    sample_colleges = [
        ("GVPCE", "GAYATRI VIDYA PARISHAD COLL. OF ENGINEERING", "www.gvpce.ac.in"),
        ("VRSEC", "VELAGAPUDI RAMAKRISHNA SIDDHARTHA ENGG. COLLEGE", "www.vrsiddhartha.ac.in"),
        ("AITK", "ANNAMACHARYA INST OF TECH AND SCI", "www.aitskadapa.ac.in"),
        ("ADIT", "ADITYA INSTITUTE OF TECHNOLOGY AND MGMT", "www.adityatekkali.com"),
        ("ALIT", "ANDHRA LOYOLA INSTT OF ENGG AND TECHNOLOGY", "www.aliet.ac.in"),
    ]
    
    conn = aiohttp.TCPConnector(ssl=False, limit=10)
    async with aiohttp.ClientSession(connector=conn) as session:
        for code, name, site in sample_colleges:
            print(f"\nScanning {code} - {name} ({site})...")
            emails = await scrape_college_site(session, site)
            print(f"  Found {len(emails)} emails:")
            for e in emails[:6]:
                print(f"    - {e['email']} | Role: {e['role']} | Dept: {e['department']} | Page: {e['source_page']}")

if __name__ == '__main__':
    asyncio.run(test_sample())
