import re
import dns.resolver
from email_validator import validate_email, EmailNotValidError
from typing import List, Optional, Literal
from pydantic import BaseModel
import openai
from automation_engine.config import OPENAI_API_KEY

EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')
PHONE_REGEX = re.compile(r'(?:\+91[\-\s]?)?[6-9]\d{9}|(?:0\d{2,4}[\-\s]?\d{6,8})')

# Static / false positive emails to discard
EXCLUDED_EXTENSIONS = ('.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js')
BLACKLIST_DOMAINS = {'sentry.io', 'example.com', 'w3.org', 'schema.org', 'domain.com'}

class ExtractedContact(BaseModel):
    target_email: str
    role: Literal[
        "Principal / Director",
        "Training & Placement Officer (TPO)",
        "Dean / HOD",
        "Cultural / Student Affairs",
        "Administrative / Office"
    ]
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    confidence_score: float = 1.0

class ContactExtractionResult(BaseModel):
    contacts: List[ExtractedContact]

class ContactExtractor:
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
        self.dns_resolver = dns.resolver.Resolver()
        self.dns_resolver.lifetime = 3.0
        self.mx_cache = {}

    def verify_email_syntax(self, email_str: str) -> Optional[str]:
        """Validates email syntax using email-validator."""
        try:
            val = validate_email(email_str, check_deliverability=False)
            return val.normalized
        except EmailNotValidError:
            return None

    def verify_dns_mx(self, email_str: str) -> bool:
        """Queries DNS MX records using dnspython to confirm mail receptivity."""
        try:
            domain = email_str.split("@")[-1].lower()
            if domain in self.mx_cache:
                return self.mx_cache[domain]

            records = self.dns_resolver.resolve(domain, 'MX')
            has_mx = len(records) > 0
            self.mx_cache[domain] = has_mx
            return has_mx
        except Exception:
            self.mx_cache[domain] = False
            return False

    def extract_raw_emails_and_phones(self, html_or_text: str):
        """Extracts valid candidate emails and phone numbers from webpage text."""
        raw_emails = EMAIL_REGEX.findall(html_or_text)
        clean_emails = set()
        for em in raw_emails:
            em_clean = em.lower().strip(".,;:()")
            if any(em_clean.endswith(ext) for ext in EXCLUDED_EXTENSIONS):
                continue
            domain = em_clean.split("@")[-1]
            if domain in BLACKLIST_DOMAINS:
                continue
            
            validated = self.verify_email_syntax(em_clean)
            if validated:
                clean_emails.add(validated)

        phones = set()
        for p in PHONE_REGEX.findall(html_or_text):
            p_clean = re.sub(r'[^\d+]', '', p)
            if len(p_clean) >= 10:
                phones.add(p_clean)

        return list(clean_emails), list(phones)

    def classify_with_openai_structured(self, context_text: str, candidate_emails: List[str]) -> List[ExtractedContact]:
        """Classifies contacts using OpenAI Structured Outputs with Pydantic schema."""
        if not self.openai_client or not candidate_emails:
            return self._fallback_deterministic_classify(context_text, candidate_emails)

        prompt = f"""
        Extract verified institutional contacts from the following university webpage text snippet.
        Candidate verified emails found: {', '.join(candidate_emails[:15])}

        Assign each contact to one of these standardized roles:
        - Principal / Director
        - Training & Placement Officer (TPO)
        - Dean / HOD
        - Cultural / Student Affairs
        - Administrative / Office

        Webpage Context:
        {context_text[:3500]}
        """
        try:
            completion = self.openai_client.beta.chat.completions.parse(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a specialized institutional data extractor for Indian universities. Extract verified contacts into structured JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format=ContactExtractionResult,
                temperature=0.0
            )
            return completion.choices[0].message.parsed.contacts
        except Exception as e:
            print(f"[OpenAI Structured Output] Notice: {e}. Utilizing deterministic classification.")
            return self._fallback_deterministic_classify(context_text, candidate_emails)

    def _fallback_deterministic_classify(self, context_text: str, candidate_emails: List[str]) -> List[ExtractedContact]:
        """Deterministic role classifier based on keyword proximity and email prefix heuristics."""
        classified = []
        text_lower = context_text.lower()

        for email in candidate_emails:
            em_lower = email.lower()
            role = "Administrative / Office"
            person = None
            conf = 0.85

            if any(k in em_lower for k in ["tpo", "placement", "placements", "training", "career"]):
                role = "Training & Placement Officer (TPO)"
                conf = 0.95
            elif any(k in em_lower for k in ["principal", "director", "head", "vc", "dean.acad"]):
                role = "Principal / Director"
                conf = 0.95
            elif any(k in em_lower for k in ["hod", "dean", "professor", "chair"]):
                role = "Dean / HOD"
                conf = 0.90
            elif any(k in em_lower for k in ["cultural", "events", "student", "media", "film"]):
                role = "Cultural / Student Affairs"
                conf = 0.90
            else:
                # Proximity analysis in page context
                pos = text_lower.find(email.lower())
                if pos != -1:
                    window = text_lower[max(0, pos-200):min(len(text_lower), pos+200)]
                    if any(k in window for k in ["placement", "tpo"]):
                        role = "Training & Placement Officer (TPO)"
                    elif any(k in window for k in ["principal", "director"]):
                        role = "Principal / Director"
                    elif any(k in window for k in ["hod", "dean"]):
                        role = "Dean / HOD"

            classified.append(ExtractedContact(
                target_email=email,
                role=role,
                contact_person=person,
                phone=None,
                confidence_score=conf
            ))

        return classified

    def process_crawled_data(self, college_id, college_name, district, state, crawled_pages):
        """Processes all crawled pages for a college and returns verified, classified contacts."""
        all_emails = set()
        all_phones = set()
        combined_text = ""

        for url, data in crawled_pages.items():
            emails, phones = self.extract_raw_emails_and_phones(data["text"])
            all_emails.update(emails)
            all_phones.update(phones)
            combined_text += f"\n--- Page: {url} ---\n" + data["text"][:1500]

        if not all_emails:
            return []

        # Step 1: Classify contacts with OpenAI Structured Outputs (or deterministic fallback)
        classified_contacts = self.classify_with_openai_structured(combined_text, list(all_emails))

        # Step 2: Dual Verification (Syntax check + DNS MX check via dnspython)
        final_contacts = []
        for c in classified_contacts:
            has_mx = self.verify_dns_mx(c.target_email)
            status = "VERIFIED_MX" if has_mx else "SYNTAX_ONLY"

            final_contacts.append({
                "college_id": college_id,
                "college_name": college_name,
                "target_email": c.target_email,
                "role": c.role,
                "district_location": f"{district}, {state}".strip(", "),
                "contact_person": c.contact_person,
                "phone": c.phone or (list(all_phones)[0] if all_phones else None),
                "email_syntax_valid": True,
                "dns_mx_verified": has_mx,
                "verification_status": status,
                "confidence_score": c.confidence_score
            })

        print(f"[Contact Extractor] Verified and classified {len(final_contacts)} contacts for {college_name} (MX Verified: {sum(1 for c in final_contacts if c['dns_mx_verified'])})")
        return final_contacts
