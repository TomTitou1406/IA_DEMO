export default function ActionsBar({ buttons }: { buttons: Array<{label: string, onClick: () => void}> }) {
  return (
    <div>
      {buttons.map((btn) => (
        <button key={btn.label} onClick={btn.onClick} className="m-2 px-4 py-2 bg-blue-600 text-white rounded">
          {btn.label}
        </button>
      ))}
    </div>
  );
}
