import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Loader2, Plus, Check } from "lucide-react";
import { useSettings } from "../../contexts/SettingsContext";
import { apiFetch } from "../../utils/api";
import { formatDate } from "../../lib/date";
import styles from "./Programs.module.css";

interface Program {
  id: string;
  name: string;
  createdTime: string;
  url: string;
}

const Programs = () => {
  const navigate = useNavigate();
  const { activeProgram, setActiveProgram } = useSettings();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrograms = async () => {
      try {
        const response = await apiFetch("/api/programs");
        const data = await response.json();

        if (response.ok) {
          setPrograms(data.programs);
        } else {
          setError(data.error || "Failed to fetch programs");
        }
      } catch (err) {
        console.error("Programs fetch error:", err);
        setError("Network error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrograms();
  }, []);

  const handleProgramClick = (program: Program) => {
    setActiveProgram({ id: program.id, name: program.name });
    navigate("/start-workout");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Programs</h1>
      </div>

      {isLoading ? (
        <div className={styles.loadingState}>
          <Loader2 size={24} className={styles.spinner} />
          <span>Loading programs...</span>
        </div>
      ) : error ? (
        <div className={styles.errorState}>
          <p>{error}</p>
        </div>
      ) : (
        <div className={styles.programsList}>
          {programs.map((program) => {
            const isActive = activeProgram?.id === program.id;
            return (
              <button
                key={program.id}
                onClick={() => handleProgramClick(program)}
                className={`${styles.programCard} ${isActive ? styles.programCardActive : ""}`}
              >
                <div className={styles.programInfo}>
                  <span className={styles.programName}>{program.name}</span>
                  <span className={styles.programDate}>
                    Created {formatDate(program.createdTime)}
                  </span>
                </div>
                {isActive ? (
                  <div className={styles.activeIndicator}>
                    <Check size={16} />
                  </div>
                ) : (
                  <ChevronRight size={16} className={styles.chevronIcon} />
                )}
              </button>
            );
          })}
        </div>
      )}

      <Link to="/programs/create" className={styles.fab}>
        <Plus size={28} strokeWidth={2.5} />
      </Link>
    </div>
  );
};

export default Programs;
