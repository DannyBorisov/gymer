import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import {
  Dumbbell,
  ArrowRight,
  Check,
  Smartphone,
  Sheet,
  Clock,
  TrendingUp,
} from "lucide-react";
import styles from "./Landing.module.css";

const Landing = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate("/programs", { replace: true });
    }
  }, [user, isLoading, navigate]);

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <Dumbbell size={20} />
            </div>
            <span>Gymerr</span>
          </div>
          {!isLoading && (
            <Link
              to={user ? "/programs" : "/login"}
              className={styles.headerCta}
            >
              {user ? "Open App" : "Get Started"}
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span>Free & Open</span>
          </div>
          <h1>
            Workout tracking
            <br />
            <span className={styles.gradient}>without the bloat</span>
          </h1>
          <p>
            Log your lifts at the gym. Everything saves to your Google Sheets —
            no account, no subscription, no lock-in.
          </p>
          <div className={styles.heroCtas}>
            <Link
              to={user ? "/programs" : "/login"}
              className={styles.primaryBtn}
            >
              {user ? "Go to App" : "Start Tracking"}
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        {/* App Preview */}
        <div className={styles.preview}>
          <div className={styles.previewPhone}>
            <div className={styles.phoneNotch} />
            <div className={styles.phoneScreen}>
              <div className={styles.screenHeader}>
                <span className={styles.screenTimer}>12:34</span>
                <span className={styles.screenProgress}>6/18 sets</span>
              </div>
              <div className={styles.screenExercise}>Barbell Bench Press</div>
              <div className={styles.screenMeta}>5 reps @ 3 RIR</div>
              <div className={styles.screenSets}>
                <div className={`${styles.screenSet} ${styles.setDone}`}>
                  <Check size={14} />
                </div>
                <div className={`${styles.screenSet} ${styles.setDone}`}>
                  <Check size={14} />
                </div>
                <div className={`${styles.screenSet} ${styles.setCurrent}`}>3</div>
                <div className={styles.screenSet}>4</div>
              </div>
              <div className={styles.screenInputs}>
                <div className={styles.screenInput}>
                  <span className={styles.inputValue}>80</span>
                  <span className={styles.inputLabel}>kg</span>
                </div>
                <div className={styles.screenInput}>
                  <span className={styles.inputValue}>5</span>
                  <span className={styles.inputLabel}>Reps</span>
                </div>
                <div className={styles.screenInput}>
                  <span className={styles.inputValue}>2</span>
                  <span className={styles.inputLabel}>RIR</span>
                </div>
              </div>
              <div className={styles.screenBtn}>Complete Set</div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className={styles.values}>
        <div className={styles.valuesGrid}>
          <div className={styles.value}>
            <div className={styles.valueIcon}>
              <Sheet size={22} />
            </div>
            <div className={styles.valueText}>
              <h3>Your data, your sheets</h3>
              <p>
                Every workout saves directly to Google Sheets in your Drive.
                Export, analyze, or delete anytime.
              </p>
            </div>
          </div>
          <div className={styles.value}>
            <div className={styles.valueIcon}>
              <Smartphone size={22} />
            </div>
            <div className={styles.valueText}>
              <h3>Built for the gym floor</h3>
              <p>
                Large touch targets, swipe navigation, auto-save every 5
                seconds. Works offline.
              </p>
            </div>
          </div>
          <div className={styles.value}>
            <div className={styles.valueIcon}>
              <TrendingUp size={22} />
            </div>
            <div className={styles.valueText}>
              <h3>Progressive overload</h3>
              <p>
                See last week's numbers at a glance. One tap to copy and beat
                your previous performance.
              </p>
            </div>
          </div>
          <div className={styles.value}>
            <div className={styles.valueIcon}>
              <Clock size={22} />
            </div>
            <div className={styles.valueText}>
              <h3>Rest timer & duration</h3>
              <p>
                Track rest between sets. Workout duration saves automatically
                when you finish.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.how}>
        <div className={styles.howInner}>
          <h2>Get started in 2 minutes</h2>
          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div className={styles.stepText}>
                <h4>Sign in with Google</h4>
                <p>We only access Sheets we create — nothing else in your Drive</p>
              </div>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div className={styles.stepText}>
                <h4>Pick a template</h4>
                <p>PPL, Upper/Lower, or build your own split from scratch</p>
              </div>
            </div>
            <div className={styles.stepLine} />
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <div className={styles.stepText}>
                <h4>Start lifting</h4>
                <p>Log sets at the gym — everything syncs to your Sheet</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2>Ready to track?</h2>
          <p>Free forever. No credit card. Your data stays yours.</p>
          <Link
            to={user ? "/programs" : "/login"}
            className={styles.ctaBtn}
          >
            {user ? "Open App" : "Get Started Free"}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLogo}>
            <Dumbbell size={18} />
            <span>Gymerr</span>
          </div>
          <p>Simple workout tracking for people who lift.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
