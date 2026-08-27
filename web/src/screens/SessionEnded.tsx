import { useNavigate } from 'react-router-dom';
import { useGame } from '../GameContext';

export function SessionEnded() {
  const navigate = useNavigate();
  const { goHome } = useGame();

  return (
    <div className="screen" style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <i className="hgi-stroke hgi-cancel-circle" style={{ fontSize: 40, color: 'var(--text-3)' }} />
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, fontSize: 20, marginTop: 18 }}>
        That game ended without you
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 8, maxWidth: 280, lineHeight: 1.5 }}>
        The table finished or was cancelled while you were disconnected. No score from it — check your profile if
        you want the details.
      </div>
      <button
        className="btn-primary"
        style={{ marginTop: 28, width: 200 }}
        onClick={() => {
          goHome();
          navigate('/home');
        }}
      >
        Back to home
      </button>
    </div>
  );
}
