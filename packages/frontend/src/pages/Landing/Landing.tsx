import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Check, Star, ChevronRight } from "lucide-react";
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

      {/* Features */}
      <section className={styles.features} id="features">
        <div className={styles.featureRow}>
          <div className={styles.featureText}>
            <span className={styles.tag}>AI Programming</span>
            <h2>Your program, built for you</h2>
            <p>
              Tell us your goals, experience, and schedule. Our AI creates a
              periodized program with progressive overload built in—or choose
              from proven templates.
            </p>
            <ul className={styles.checkList}>
              <li>
                <Check size={18} />
                Personalized to your training history
              </li>
              <li>
                <Check size={18} />
                Auto-adjusts volume and intensity weekly
              </li>
              <li>
                <Check size={18} />
                PPL, Upper/Lower, Full Body templates
              </li>
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
            <span className={styles.tag}>Smart Logging</span>
            <h2>Log sets in seconds</h2>
            <p>
              Large touch targets, auto-fill from your last workout, and
              voice-guided rest timers. Less tapping, more lifting.
            </p>
            <ul className={styles.checkList}>
              <li>
                <Check size={18} />
                One-tap to copy previous weights
              </li>
              <li>
                <Check size={18} />
                Voice countdown: "30 seconds remaining"
              </li>
              <li>
                <Check size={18} />
                Works offline, syncs when connected
              </li>
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
              <li>
                <Check size={18} />
                Strength trends over weeks and months
              </li>
              <li>
                <Check size={18} />
                Plateau alerts after 4+ flat sessions
              </li>
              <li>
                <Check size={18} />
                Recovery heatmap by muscle group
              </li>
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
            Start Your Free Trial
            <ChevronRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.logo}>ikkos</span>
            <p>The workout tracker that works.</p>
          </div>
          <nav className={styles.footerLinks}>
            <Link to="/terms">Terms</Link>
            <Link to="/privacy">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
