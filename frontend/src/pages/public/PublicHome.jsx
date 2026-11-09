
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  MapPin,
  Phone,
  Radio,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

import api from "../../services/api";

const INSTITUTE_PHONE = "+917065913913";

export default function PublicHome() {
  const [onlineClass, setOnlineClass] = useState(null);
  const [classLoading, setClassLoading] = useState(true);
  const [classError, setClassError] = useState(false);

  const phoneLink = INSTITUTE_PHONE
    ? `tel:${INSTITUTE_PHONE.replace(/[^\d+]/g, "")}`
    : null;

  useEffect(() => {
    const fetchOnlineClass = async () => {
      try {
        const response = await api.get("/public/online-class");
        setOnlineClass(response.data);
      } catch (error) {
        console.error("Unable to fetch online class:", error);
        setClassError(true);
      } finally {
        setClassLoading(false);
      }
    };

    fetchOnlineClass();
  }, []);

  return (
    <main className="public-page">
      {/* Navigation */}
      <nav className="public-nav">
        <Link className="brand" to="/">
          <img
              src="src\pages\public\images\gk-logo.webp"
              alt="G.K. Tutorials Logo"
              className="brand-logo"
            />
          <span>
            <strong>G.K. TUTORIALS</strong>
            <small>Premier Institute of Science & Commerce</small>
          </span>
        </Link>

        <div className="nav-links">
          <a href="#courses">Courses</a>
          <a href="#online-classes" className="nav-online-classes">
            Online Classes
          </a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <a href="#enquiry" className="nav-enquiry">
            Enquire Now
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">SUBHASH NAGAR · NEW DELHI</span>

          <h1>
            Build strong foundations.
            <br />
            <span>Achieve your goals.</span>
          </h1>

          <p>
            Quality coaching for Classes 9–12 in Science and Commerce,
            with focused teaching and personal attention.
          </p>

          <div className="hero-actions">
            <a className="button button-primary" href="#enquiry">
              Enquire about admissions <ArrowRight size={17} />
            </a>

            {phoneLink && (
              <a className="button button-outline" href={phoneLink}>
                <Phone size={16} /> Call Now
              </a>
            )}
          </div>

          <div className="hero-note">
            <GraduationCap size={18} />
            Established in 2017 · Experienced faculty
          </div>
        </div>

        <div className="hero-card">
          <div className="hero-card-icon">
            <BookOpen size={30} />
          </div>

          <h2>Learn with clarity.</h2>

          <p>
            Personal attention, subject-focused teaching and a
            supportive learning environment.
          </p>

          <div className="subject-pills">
            <span>Mathematics</span>
            <span>Science</span>
            <span>Commerce</span>
            <span>English</span>
          </div>
        </div>
      </section>

      {/* Courses */}
      <section className="section" id="courses">
        <div className="section-heading public-section-heading">
          <span className="eyebrow">OUR PROGRAMMES</span>
          <h2>Coaching for Classes 9–12</h2>
          <p>Subject-focused learning for different academic streams.</p>
        </div>

        <div className="course-grid">
          <article className="course-card">
            <span className="course-number">01</span>
            <h3>Classes IX–X</h3>
            <p>Core school subjects for a strong academic foundation.</p>

            <ul className="course-subject-list">
              <li><CheckCircle2 size={15} /> Mathematics</li>
              <li><CheckCircle2 size={15} /> Science</li>
              <li><CheckCircle2 size={15} /> Social Science</li>
              <li><CheckCircle2 size={15} /> English</li>
            </ul>
          </article>

          <article className="course-card">
            <span className="course-number">02</span>
            <h3>Classes XI–XII · Science</h3>
            <p>Focused coaching for senior secondary Science students.</p>

            <ul className="course-subject-list">
              <li><CheckCircle2 size={15} /> Physics</li>
              <li><CheckCircle2 size={15} /> Chemistry</li>
              <li><CheckCircle2 size={15} /> Biology</li>
              <li><CheckCircle2 size={15} /> Mathematics</li>
              <li><CheckCircle2 size={15} /> English</li>
              <li><CheckCircle2 size={15} /> Computer Science</li>
            </ul>
          </article>

          <article className="course-card">
            <span className="course-number">03</span>
            <h3>Classes XI–XII · Commerce</h3>
            <p>Build confidence in core Commerce subjects.</p>

            <ul className="course-subject-list">
              <li><CheckCircle2 size={15} /> Accountancy</li>
              <li><CheckCircle2 size={15} /> Business Studies</li>
              <li><CheckCircle2 size={15} /> Economics</li>
              <li><CheckCircle2 size={15} /> Mathematics</li>
              <li><CheckCircle2 size={15} /> English</li>
              <li><CheckCircle2 size={15} /> Informatics Practices</li>
            </ul>
          </article>
        </div>

        <div className="courses-cta">
          <p>Need help choosing subjects?</p>
          <a href="#enquiry">
            Talk to us about courses <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Online Classes */}
      <section className="online-class-section" id="online-classes">
        <div className="online-class-content">
          <span className="eyebrow">LEARN FROM ANYWHERE</span>
          <h2>Online Classes</h2>
          <p>
            Join your G.K. Tutorials classes online from wherever you are.
          </p>

          {classLoading ? (
            <div className="online-class-message">
              Loading online class details...
            </div>
          ) : classError ? (
            <div className="online-class-message">
              Online class information is temporarily unavailable.
              Please try again later.
            </div>
          ) : onlineClass ? (
            <div className="live-class-card">
              <div className="live-class-icon">
                <Radio size={26} />
              </div>

              <div className="live-class-details">
                <span className="live-class-label">
                  <span className="live-dot"></span>
                  ONLINE CLASS AVAILABLE
                </span>

                <h3>{onlineClass.title}</h3>
                <p>
                  Your class link is ready. Click below to join the session.
                </p>

                <a
                  className="button button-primary join-class-button"
                  href={onlineClass.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join Online Class <ExternalLink size={17} />
                </a>
              </div>
            </div>
          ) : (
            <div className="online-class-message">
              No online class is currently available. Please check back later.
            </div>
          )}
        </div>
      </section>

      {/* About */}
      <section className="about-band" id="about">
        <div>
          <span className="eyebrow">ABOUT G.K. TUTORIALS</span>
          <h2>
            Personal attention.
            <br />
            Consistent learning.
          </h2>
        </div>

        <div className="about-band-content">
          <p>
            Founded by Gaurav Kumar, G.K. Tutorials has been helping
            students build subject knowledge since 2017. Our focus is
            clear teaching, individual attention and steady academic progress.
          </p>

          <a href="#courses" className="about-link">
            Explore our courses <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Contact */}
      <section className="section contact-section" id="contact">
        <div className="contact-info">
          <span className="eyebrow">GET IN TOUCH</span>
          <h2>Let's discuss your learning goals.</h2>

          <p>
            <MapPin size={18} />
            <span>
              5/3, F.F., Subhash Nagar, Near Cambridge Foundation School,
              New Delhi
            </span>
          </p>

          {phoneLink && (
            <p>
              <Phone size={18} />
              <a href={phoneLink}>Call G.K. Tutorials</a>
            </p>
          )}
        </div>

        <div className="contact-actions">
          <a className="button button-primary" href="#enquiry">
            Send an enquiry <ArrowRight size={17} />
          </a>

          {phoneLink && (
            <a className="button button-outline" href={phoneLink}>
              <Phone size={16} /> Call Now
            </a>
          )}

          <span>Contact us for course details, timings and availability.</span>
        </div>
      </section>

      {/* Enquiry */}
      <section className="enquiry-section" id="enquiry">
        <div className="enquiry-copy">
          <span className="eyebrow">ADMISSIONS OPEN</span>
          <h2>Take the first step towards better learning.</h2>
          <p>
            Interested in joining G.K. Tutorials? Contact us to discuss
            available courses, subjects and admission details.
          </p>
        </div>

        <div className="enquiry-actions">
          {phoneLink ? (
            <a className="button button-primary enquiry-call-button" href={phoneLink}>
              <Phone size={17} /> Call Now
            </a>
          ) : (
            <p className="phone-setup-note">
              Add the institute phone number to enable direct calling.
            </p>
          )}

          <a className="button button-outline" href="#courses">
            Explore Courses <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="public-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <strong>G.K. TUTORIALS</strong>
            <p>Building strong foundations since 2017.</p>
            <span>Subhash Nagar, New Delhi</span>
          </div>

          <div className="footer-links">
            <strong>QUICK LINKS</strong>
            <a href="#courses">Courses</a>
            <a href="#online-classes">Online Classes</a>
            <a href="#about">About Us</a>
            <a href="#contact">Contact</a>
            <a href="#enquiry">Admissions</a>
          </div>

          <div className="footer-contact">
            <strong>CONTACT</strong>
            <a href="#contact">
              <MapPin size={15} /> Visit our institute
            </a>

            {phoneLink && (
              <a href={phoneLink}>
                <Phone size={15} /> Call the institute
              </a>
            )}
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} G.K. Tutorials. All rights reserved.</span>
          <a href="#top" onClick={(event) => {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}>
            Back to top ↑
          </a>
        </div>
      </footer>
    </main>
  );
}
