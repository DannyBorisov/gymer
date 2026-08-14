import { Link } from "react-router-dom";
import styles from "./CreateProgram.module.css";

const CreateProgram = () => {
  return (
    <div className={styles.container}>
      <Link to="/programs" className={styles.backLink}>
        &larr; Back to Programs
      </Link>

      <h1 className={styles.title}>Create Program</h1>
      <p className={styles.subtitle}>Design your custom workout program</p>

      <form className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="name" className={styles.label}>
            Program Name
          </label>
          <input
            type="text"
            id="name"
            className={styles.input}
            placeholder="e.g., Push Pull Legs"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="description" className={styles.label}>
            Description
          </label>
          <textarea
            id="description"
            className={styles.textarea}
            placeholder="Describe your program..."
            rows={4}
          />
        </div>

        <button type="submit" className={styles.submitButton}>
          Create Program
        </button>
      </form>
    </div>
  );
};

export default CreateProgram;
