export default function Timer({ timeLeft }) {
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const display = `${mins}:${secs.toString().padStart(2, '0')}`;
  const urgent = timeLeft <= 30;

  return (
    <div className={`timer-bar ${urgent ? 'urgent' : ''}`}>
      <span>⏱</span>
      <span>{display}</span>
    </div>
  );
}
