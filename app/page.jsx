'use client';

import Link from 'next/link';
import styles from './landing.module.css';
import {
  Send,
  Users,
  Calendar,
  FileCheck,
  Activity,
  CheckCircle2,
  ArrowRight,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className={styles.landingWrapper}>
      {/* 1. Header / Navigation */}
      <header className={styles.header}>
        <div className={`${styles.container} ${styles.navContainer}`}>
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <Send size={20} />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>Internship Email Automation</span>
              <span className={styles.brandTagline}>Shortfundly Operations Portal</span>
            </div>
          </div>

          <nav className={styles.navLinks}>
            <a href="#home" className={styles.navLink}>Home</a>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
            <a href="#contact" className={styles.navLink}>Contact</a>
          </nav>

          <Link href="/login" className={styles.btnPrimary}>
            <span>Get Started</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="home" className={styles.heroSection}>
        <div className={styles.container}>
          <div className={styles.heroBadge}>
            <Sparkles size={14} />
            <span>Shortfundly Media Technologies Pvt. Ltd.</span>
          </div>

          <h1 className={styles.headline}>
            Simplify Internship Communication
          </h1>

          <p className={styles.subheading}>
            Manage internship candidate details and streamline email communication from joining confirmation to internship completion — all in one place.
          </p>

          <div className={styles.heroActions}>
            <Link href="/login" className={styles.btnPrimary} style={{ padding: '12px 28px', fontSize: '15px' }}>
              <span>Get Started</span>
              <ArrowRight size={17} />
            </Link>
            <a href="#features" className={styles.btnSecondary} style={{ padding: '12px 24px', fontSize: '15px' }}>
              <span>Explore Features</span>
            </a>
          </div>

          <p className={styles.supportingText}>
            A smarter way to manage internship emails and candidate communication.
          </p>
        </div>
      </section>

      {/* 3. About the Platform */}
      <section className={styles.aboutSection}>
        <div className={styles.container}>
          <div className={styles.aboutCard}>
            <h2 className={styles.aboutTitle}>Internship Communication, Made Simple</h2>
            <p className={styles.aboutContent}>
              Internship Email Automation helps the team organize candidate information and manage internship-related email communication through a single platform. Reduce repetitive manual work, maintain accurate records, and ensure candidates receive timely updates throughout their internship journey.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Key Features */}
      <section id="features" className={styles.featuresSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTag}>Platform Capabilities</div>
            <h2 className={styles.sectionTitle}>Key Features</h2>
          </div>

          <div className={styles.featuresGrid}>
            {/* Feature 1 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Users size={22} />
              </div>
              <h3 className={styles.featureTitle}>Candidate Management</h3>
              <p className={styles.featureDesc}>
                Store and manage candidate names, email addresses, designations, joining dates, internship end dates, and other relevant details.
              </p>
            </div>

            {/* Feature 2 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Send size={22} />
              </div>
              <h3 className={styles.featureTitle}>Automated Email Communication</h3>
              <p className={styles.featureDesc}>
                Streamline internship-related emails using reusable templates and candidate-specific information.
              </p>
            </div>

            {/* Feature 3 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Calendar size={22} />
              </div>
              <h3 className={styles.featureTitle}>Internship Timeline Tracking</h3>
              <p className={styles.featureDesc}>
                Track joining dates, internship duration, and completion dates to support timely communication.
              </p>
            </div>

            {/* Feature 4 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Layers size={22} />
              </div>
              <h3 className={styles.featureTitle}>Reusable Email Templates</h3>
              <p className={styles.featureDesc}>
                Prepare consistent email formats for internship offers, onboarding, reminders, updates, and completion notifications.
              </p>
            </div>

            {/* Feature 5 */}
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Activity size={22} />
              </div>
              <h3 className={styles.featureTitle}>Email Status Monitoring</h3>
              <p className={styles.featureDesc}>
                Keep track of email processing results and identify messages that require attention.
              </p>
            </div>

            {/* Feature 6 - Compliance */}
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Shield size={22} />
              </div>
              <h3 className={styles.featureTitle}>Enterprise Delivery Security</h3>
              <p className={styles.featureDesc}>
                Built-in cryptographic authentication, Google SMTP transport, rate limit controls, and audit trails for all communications.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works */}
      <section id="how-it-works" className={styles.howSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTag}>Workflow</div>
            <h2 className={styles.sectionTitle}>How It Works</h2>
          </div>

          <div className={styles.stepsGrid}>
            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>01</span>
              <h3 className={styles.stepTitle}>Add Candidate Details</h3>
              <p className={styles.stepDesc}>
                Upload candidate records or enter internship information into the system.
              </p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>02</span>
              <h3 className={styles.stepTitle}>Choose an Email Template</h3>
              <p className={styles.stepDesc}>
                Select the appropriate email type and personalize it with candidate details.
              </p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>03</span>
              <h3 className={styles.stepTitle}>Review and Send</h3>
              <p className={styles.stepDesc}>
                Verify the recipient list and email content before sending messages.
              </p>
            </div>

            <div className={styles.stepCard}>
              <span className={styles.stepNumber}>04</span>
              <h3 className={styles.stepTitle}>Monitor Email Status</h3>
              <p className={styles.stepDesc}>
                Review sending results and manage follow-up communication when required.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Benefits */}
      <section className={styles.benefitsSection}>
        <div className={styles.container}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTag}>Key Advantages</div>
            <h2 className={styles.sectionTitle}>Designed for Efficient Internship Management</h2>
          </div>

          <div className={styles.benefitsGrid}>
            <div className={styles.benefitItem}>
              <CheckCircle2 size={18} className={styles.benefitIcon} />
              <span className={styles.benefitText}>Reduce repetitive email-writing tasks.</span>
            </div>
            <div className={styles.benefitItem}>
              <CheckCircle2 size={18} className={styles.benefitIcon} />
              <span className={styles.benefitText}>Maintain organized candidate records.</span>
            </div>
            <div className={styles.benefitItem}>
              <CheckCircle2 size={18} className={styles.benefitIcon} />
              <span className={styles.benefitText}>Improve consistency across internship communications.</span>
            </div>
            <div className={styles.benefitItem}>
              <CheckCircle2 size={18} className={styles.benefitIcon} />
              <span className={styles.benefitText}>Minimize manual errors through personalized templates.</span>
            </div>
            <div className={styles.benefitItem}>
              <CheckCircle2 size={18} className={styles.benefitIcon} />
              <span className={styles.benefitText}>Manage internship timelines more efficiently.</span>
            </div>
            <div className={styles.benefitItem}>
              <CheckCircle2 size={18} className={styles.benefitIcon} />
              <span className={styles.benefitText}>Keep email activity organized in one place.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Final Call to Action */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaCard}>
            <h2 className={styles.ctaHeadline}>Make Every Internship Email Easier to Manage</h2>
            <p className={styles.ctaContent}>
              Bring candidate information and internship communication together in one streamlined workflow.
            </p>
            <Link href="/login" className={styles.btnPrimary} style={{ padding: '14px 34px', fontSize: '15px' }}>
              <span>Get Started</span>
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer id="contact" className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerTop}>
            <div>
              <div className={styles.brand}>
                <div className={styles.brandIcon} style={{ width: '32px', height: '32px' }}>
                  <Send size={16} />
                </div>
                <span className={styles.brandName} style={{ fontSize: '15px' }}>Internship Email Automation</span>
              </div>
              <p className={styles.footerBrandDesc}>
                Simplifying internship communication through organized candidate management and email automation.
              </p>
            </div>

            <div className={styles.footerLinks}>
              <a href="#home" className={styles.footerLink}>Home</a>
              <a href="#features" className={styles.footerLink}>Features</a>
              <a href="#how-it-works" className={styles.footerLink}>How It Works</a>
              <a href="#contact" className={styles.footerLink}>Contact</a>
            </div>
          </div>

          <div className={styles.footerBottom}>
            &copy; 2026 Internship Email Automation. All rights reserved. &bull; Shortfundly Media Technologies Pvt. Ltd.
          </div>
        </div>
      </footer>
    </div>
  );
}
