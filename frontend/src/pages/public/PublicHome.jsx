import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, GraduationCap, MapPin, Phone } from "lucide-react";

export default function PublicHome() {
  return (
    <main className="public-page">
      <nav className="public-nav">
        <Link className="brand" to="/">
          <span className="brand-mark">GK</span>
          <span><strong>G.K. TUTORIALS</strong><small>Premier Institute of Science & Commerce</small></span>
        </Link>
        <div className="nav-links">
          <a href="#courses">Courses</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
          <Link className="button button-outline" to="/admin/login">Admin login</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">SUBHASH NAGAR · NEW DELHI</span>
          <h1>Build strong foundations.<br /><span>Achieve your goals.</span></h1>
          <p>Focused coaching for Classes 9–12 across Science, Commerce and school subjects.</p>
          <a className="button button-primary" href="#enquiry">Enquire about admissions <ArrowRight size={17} /></a>
          <div className="hero-note"><GraduationCap size={18} /> Established in 2017 · Experienced faculty</div>
        </div>
        <div className="hero-card">
          <div className="hero-card-icon"><BookOpen size={30} /></div>
          <h2>Learn with clarity.</h2>
          <p>Personal attention, subject-focused teaching and a supportive learning environment.</p>
          <div className="subject-pills"><span>Mathematics</span><span>Science</span><span>Commerce</span><span>English</span></div>
        </div>
      </section>

      <section className="section" id="courses">
        <div className="section-heading"><span className="eyebrow">OUR PROGRAMMES</span><h2>Coaching for Classes 9–12</h2><p>Choose the subjects that match your academic needs.</p></div>
        <div className="course-grid">
          <article className="course-card"><span className="course-number">01</span><h3>Classes IX–X</h3><p>Mathematics, Science, English and Social Science.</p></article>
          <article className="course-card"><span className="course-number">02</span><h3>Classes XI–XII · Science</h3><p>Physics, Chemistry, Mathematics, Biology and Computer Science.</p></article>
          <article className="course-card"><span className="course-number">03</span><h3>Classes XI–XII · Commerce</h3><p>Accountancy, Business Studies, Economics, Mathematics and more.</p></article>
        </div>
      </section>

      <section className="about-band" id="about"><div><span className="eyebrow">ABOUT G.K. TUTORIALS</span><h2>Personal attention.<br />Consistent learning.</h2></div><p>Founded by Gaurav Kumar, G.K. Tutorials has been helping students build subject knowledge since 2017. Our focus is clear teaching and steady academic progress.</p></section>

      <section className="section contact-section" id="contact">
        <div><span className="eyebrow">GET IN TOUCH</span><h2>Talk to us about admissions.</h2><p><MapPin size={17} /> 5/3, F.F., Subhash Nagar, Near Cambridge Foundation School, New Delhi</p></div>
        <div className="contact-actions"><a className="button button-primary" href="#enquiry">Send an enquiry <ArrowRight size={17} /></a><span><Phone size={16} /> Contact the institute for current timings and availability.</span></div>
      </section>

      <section className="enquiry-section" id="enquiry"><div><span className="eyebrow">ADMISSIONS</span><h2>Start with an enquiry.</h2><p>Our online enquiry form will be connected to the institute's admin system in the next development milestone.</p></div><Link className="button button-outline" to="/admin/login">Admin login <ArrowRight size={17} /></Link></section>
      <footer><strong>G.K. TUTORIALS</strong><span>© {new Date().getFullYear()} G.K. Tutorials. All rights reserved.</span></footer>
    </main>
  );
}
