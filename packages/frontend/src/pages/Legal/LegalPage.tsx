import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Dumbbell } from "lucide-react";
import styles from "./LegalPage.module.css";

type LegalDocument = "terms" | "privacy";

const documents: Record<LegalDocument, {
  title: string;
  intro: string;
  sections: { heading: string; content: string }[];
}> = {
  terms: {
    title: "Terms of Service",
    intro: "These terms explain the basic rules for using Gymerr.",
    sections: [
      {
        heading: "Using Gymerr",
        content: "Gymerr is a workout tracking tool. You are responsible for the information you enter and for keeping your Google account secure. You must use the service lawfully and avoid attempting to disrupt, abuse, or gain unauthorized access to the service.",
      },
      {
        heading: "Your data",
        content: "Gymerr uses Google OAuth and Google Sheets to provide its workout tracking features. You keep ownership of your workout data. You can manage or delete the spreadsheets created in your Google Drive.",
      },
      {
        heading: "Health and safety",
        content: "Gymerr does not provide medical, fitness, or professional health advice. Use your own judgment, follow appropriate instruction, and consult a qualified professional when needed. Stop exercising if you feel unwell or unsafe.",
      },
      {
        heading: "Availability",
        content: "We aim to keep Gymerr useful and available, but the service is provided as-is and may change, be interrupted, or be discontinued. We are not responsible for loss caused by outages, third-party services, or inaccurate workout information.",
      },
      {
        heading: "Changes",
        content: "We may update these terms as Gymerr changes. Continued use of the service after an update means you accept the revised terms.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    intro: "This policy describes what Gymerr handles when you use the service.",
    sections: [
      {
        heading: "Information we receive",
        content: "When you sign in with Google, Gymerr receives basic profile information such as your name, email address, and profile image. Workout information is the data you choose to enter into the app.",
      },
      {
        heading: "How we use information",
        content: "We use this information to authenticate you, maintain your session, display your profile, and provide workout tracking. Workout data is stored in Google Sheets in your Google Drive so the app can read and update it.",
      },
      {
        heading: "Google services",
        content: "Gymerr uses Google OAuth, Google Drive, and Google Sheets. We request access needed for spreadsheets created by Gymerr. Google handles its services under its own privacy policy and terms.",
      },
      {
        heading: "Storage and choices",
        content: "The web app uses browser storage for a session token. You can sign out to remove that token from the device and revoke Gymerr access from your Google Account security settings. You can also delete Gymerr spreadsheets from Google Drive.",
      },
      {
        heading: "Sharing and retention",
        content: "We do not sell your personal information. We do not use your workout data for advertising. Information is retained only as needed to provide the service, or in the Google Drive account and browser storage that you control.",
      },
      {
        heading: "Updates",
        content: "We may update this policy when the service or its data practices change. The latest version will be available on this page.",
      },
    ],
  },
};

const LegalPage = () => {
  const location = useLocation();
  const documentType: LegalDocument = location.pathname === "/privacy" ? "privacy" : "terms";
  const document = documents[documentType];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.brand} aria-label="Back to Gymerr home">
          <span className={styles.brandIcon}><Dumbbell size={18} /></span>
          <span>Gymerr</span>
        </Link>
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={16} />
          Home
        </Link>
      </header>

      <article className={styles.document}>
        <p className={styles.eyebrow}>Gymerr</p>
        <h1>{document.title}</h1>
        <p className={styles.intro}>{document.intro}</p>
        <p className={styles.updated}>Effective August 28, 2026</p>

        {document.sections.map((section) => (
          <section className={styles.section} key={section.heading}>
            <h2>{section.heading}</h2>
            <p>{section.content}</p>
          </section>
        ))}

        <nav className={styles.switcher} aria-label="Legal pages">
          <Link className={documentType === "terms" ? styles.active : undefined} to="/terms">
            Terms of Service
          </Link>
          <Link className={documentType === "privacy" ? styles.active : undefined} to="/privacy">
            Privacy Policy
          </Link>
        </nav>
      </article>
    </main>
  );
};

export default LegalPage;
