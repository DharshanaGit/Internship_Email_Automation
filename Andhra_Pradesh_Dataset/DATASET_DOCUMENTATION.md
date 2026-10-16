# Andhra Pradesh Higher Education Institutions & Staff Directory Dataset

**State**: Andhra Pradesh  
**Total Colleges Scraped & Verified**: 1,796  
**Total Unique Staff / Dean / HOD Contacts**: 2,136  
**Official Sources**:  
1. [AP EAPCET Official College Master (aptonline.in)](https://eapcet-sche.aptonline.in/EAPCET/collegeMaster)  
2. [AP Common Admissions Portal (CAP APCFSS)](https://cap.apcfss.in/)  
3. [Andhra Pradesh State Council of Higher Education (APSCHE)](https://cets.apsche.ap.gov.in/APSCHE/APSCHEHome.aspx)  
4. Official Institutional Websites of Individual Colleges  

---

## Dataset Files in this Folder

| File Name | Format | Description |
|---|---|---|
| **`Andhra_Pradesh_Colleges_Complete_Master.xlsx`** | Excel (.xlsx) | Master directory of all **1,796** colleges across Andhra Pradesh with affiliations, courses offered, principal emails, phone numbers, and full addresses. |
| **`Andhra_Pradesh_College_Staff_Dean_HOD_Contacts.xlsx`** | Excel (.xlsx) | Granular contact directory of **2,136** individual contacts including Principals, Deans, HODs, Placement Officers, and Department Staff. |
| **`Andhra_Pradesh_Colleges_Unified.csv`** | CSV (.csv) | Formatted CSV ready for direct bulk import into the Shortfundly Outreach Portal or any mailing CRM. |

---

## Required Column Specification

| Column Header | Description & Example |
|---|---|
| **`State and city`** | State and locality (e.g. `Andhra Pradesh, Visakhapatnam`, `Andhra Pradesh, Guntur`). |
| **`College name`** | Official name of the institution (e.g. `GAYATRI VIDYA PARISHAD COLL. OF ENGINEERING`). |
| **`College Code`** | Government counseling institute code (e.g. `GVPCE`, `VRSEC`, `ALIT`). |
| **`Official website URL`** | Verified official web address (e.g. `http://www.gvpce.ac.in`). |
| **`Department or contact person, if available`** | Department or designation (e.g. `Head of Department (HOD) - Computer Science & Engineering`). |
| **`Official email address`** | Verified official email address of the institution, Dean, or HOD. |
| **`Source page URL`** | Specific URL where the contact details were verified. |

---

## Academic Streams Covered

- **Engineering & Technology** (AP EAPCET & ECET): 399 colleges
- **Management & Computer Applications** (AP ICET - MBA & MCA): 349 colleges
- **Pharmacy & Pharmaceutical Sciences** (B.Pharm, M.Pharm, Pharm.D): 313 colleges
- **Education & Teacher Training** (AP EDCET - B.Ed): 445 colleges
- **Law & Legal Studies** (AP LAWCET - LL.B, LL.M): 35 colleges
- **Postgraduate Arts, Science & Commerce** (AP PGCET): 292 colleges
- **Architecture** (AP BARCH): 5 colleges

---

## Data Verification & Anti-Duplicate Guarantee

1. **100% Parameterized Deduplication**: Email addresses and college codes were normalized and deduplicated using strict set theory.
2. **Syntactic & RFC 5322 Validation**: Every email was sanitized to eliminate invalid image tags, web framework placeholders, or malformed characters.
3. **Role Categorization**: Automated heuristic classification identified leadership roles (Principal, Vice Chancellor, Director, Dean, HOD, Placement Officer).
