import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Star } from "lucide-react"; // avoid-ai-design-ignore: I3 - rating stars
import HeroPhone from "./HeroPhone";
import styles from "./Landing.module.css";

const Landing = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/welcome", { replace: true });
    }
  }, [user, isLoading, navigate]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>ikkos</div>
          <nav className={styles.nav}>
            <a href="#features">Features</a>
            <a href="#science">The Science</a>
            <a href="#how">How it works</a>
          </nav>
          <div className={styles.headerActions}>
            {!isLoading && (
              <Link
                to={user ? "/welcome" : "/login"}
                className={styles.headerCta}
              >
                {user ? "Open App" : "Get Started"}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className={styles.heroWrapper}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
          <h1>
            Stop Guessing.
            <br />
            Start Progressing.
          </h1>
          <p className={styles.heroSub}>
            AI-powered programming, smart progression tracking, and voice-guided
            rest timers. Join thousands of lifters who train smarter.
          </p>
          <div className={styles.storeBadges}>
            <a href="#" className={styles.storeBadge}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <div className={styles.storeText}>
                <span>Download on the</span>
                <strong>App Store</strong>
              </div>
            </a>
            <a href="#" className={styles.storeBadge}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.802 8.99l-2.303 2.303-8.635-8.635z"/>
              </svg>
              <div className={styles.storeText}>
                <span>Get it on</span>
                <strong>Google Play</strong>
              </div>
            </a>
          </div>
          <div className={styles.heroProof}>
            <div className={styles.rating}>
              <div className={styles.stars}>
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="#fbbf24" stroke="#fbbf24" />
                ))}
              </div>
              <span>4.9 rating</span>
            </div>
            <span className={styles.divider}>•</span>
            <span>2,400+ reviews</span>
          </div>
        </div>
          <div className={styles.heroVisual}>
            <HeroPhone />
          </div>
        </section>
      </div>

      {/* Features */}
      <section className={styles.features} id="features">
        <div className={styles.featureRow}>
          <div className={styles.featureText}>
            <span className={styles.tag}>Programming</span>
            <h2>Your program, built for you</h2>
            <p>
              Tell us your goals, experience, and schedule. Our AI creates a
              periodized program with progressive overload built in—or choose
              from proven templates.
            </p>
            <ul className={styles.checkList}>
              <li>Personalized to your training history</li>
              <li>Auto-adjusts volume and intensity weekly</li>
              <li>PPL, Upper/Lower, Full Body templates</li>
            </ul>
          </div>
          <div className={styles.featureVisual}>
            <img
              src="/landing/program.png"
              alt="Program builder"
              className={styles.featureImg}
            />
          </div>
        </div>

        <div className={`${styles.featureRow} ${styles.reverse}`}>
          <div className={styles.featureText}>
            <span className={styles.tag}>Logging</span>
            <h2>Log sets in seconds</h2>
            <p>
              Large touch targets, auto-fill from your last workout, and
              voice-guided rest timers. Less tapping, more lifting.
            </p>
            <ul className={styles.checkList}>
              <li>One-tap to copy previous weights</li>
              <li>Voice countdown: "30 seconds remaining"</li>
              <li>Works offline, syncs when connected</li>
            </ul>
          </div>
          <div className={styles.featureVisual}>
            <img
              src="/landing/workout.png"
              alt="Workout logging"
              className={styles.featureImg}
            />
          </div>
        </div>

        <div className={styles.featureRow}>
          <div className={styles.featureText}>
            <span className={styles.tag}>Analytics</span>
            <h2>See what's working</h2>
            <p>
              Track estimated 1RM, volume by muscle group, and personal records.
              Automatic plateau detection tells you when to switch things up.
            </p>
            <ul className={styles.checkList}>
              <li>Strength trends over weeks and months</li>
              <li>Plateau alerts after 4+ flat sessions</li>
              <li>Recovery heatmap by muscle group</li>
            </ul>
          </div>
          <div className={styles.featureVisual}>
            <img
              src="/landing/analytics.png"
              alt="Analytics dashboard"
              className={styles.featureImg}
            />
          </div>
        </div>
      </section>

      {/* Science Section */}
      <section className={styles.science} id="science">
        <div className={styles.scienceInner}>
          <h2>Why it works</h2>
          <p className={styles.scienceLead}>
            Your body adapts to stress. Bench 135 every week for a year, you'll stay the same.
          </p>

          <dl className={styles.concepts}>
            <div className={styles.concept}>
              <dt>Progressive Overload</dt>
              <dd>
                Last week: 3×8 at 100 lbs. This week: 3×9, or 3×8 at 105. The app tracks every
                set and tells you when you're ready to add weight.
              </dd>
            </div>
            <div className={styles.concept}>
              <dt>RIR Training</dt>
              <dd>
                "2 RIR" = stopped with 2 reps left. Too easy, no growth. Too hard, can't recover.
                We set your targets and adjust them week to week.
              </dd>
            </div>
            <div className={styles.concept}>
              <dt>Plateau Detection</dt>
              <dd>
                Stuck at the same weight? Most people don't notice for months. The app flags
                when your e1RM flatlines and suggests what to change.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.how} id="how">
        <div className={styles.howInner}>
          <h2>Get started in 2 minutes</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <h3>Sign up</h3>
              <p>
                Connect with Google. Your data lives in your own Google
                Sheet—export or delete anytime.
              </p>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <h3>Get your program</h3>
              <p>
                Generate a custom AI program or pick from battle-tested
                templates.
              </p>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <h3>Start lifting</h3>
              <p>
                Log workouts, track progress, and let the app tell you what to
                lift next.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2>Ready to train smarter?</h2>
          <p>Free for 14 days. No credit card required.</p>
          <Link to="/login" className={styles.ctaPrimary}>
            Start free trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.logo}>ikkos</span>
            <p>The workout tracker that works.</p>
            <div className={styles.socialLinks}>
              <a href="#" aria-label="Instagram">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="#" aria-label="Twitter">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="#" aria-label="TikTok">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </a>
              <a href="#" aria-label="Facebook">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
          </div>
          <nav className={styles.footerLinks}>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
            <a href="mailto:support@ikkos.app">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
