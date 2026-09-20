import { WarningIcon, SparklesOutlineIcon } from "../../assets/icons";
import { SwipeableDrawer } from "../../components/SwipeableDrawer/SwipeableDrawer";
import styles from "./PlateauDrawer.module.css";

export interface PlateauDrawerProps {
  exercise: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Explains what "Plateau" means on an exercise card, with an "Ask AI"
 * action reserved for later — UI only for now, no backend call yet.
 */
export const PlateauDrawer = ({ exercise, isOpen, onClose }: PlateauDrawerProps) => {
  return (
    <SwipeableDrawer isOpen={isOpen} onClose={onClose} dark>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrapper}>
          <WarningIcon size={22} />
        </div>
        <h2 className={styles.title}>{exercise} has plateaued</h2>
        <p className={styles.description}>
          Your estimated 1RM hasn't meaningfully improved over the last few
          sessions. That can mean it's time to change rep range, add volume,
          or take a deload — or it could just be normal fluctuation if you're
          close to your current ceiling.
        </p>
        <button type="button" className={styles.askAiBtn} disabled>
          <SparklesOutlineIcon size={16} />
          <span>Ask AI for advice</span>
        </button>
        <span className={styles.comingSoon}>Coming soon</span>
      </div>
    </SwipeableDrawer>
  );
};
