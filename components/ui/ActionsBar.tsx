"use client";

type Button = {
  label: string;
  onClick: () => void;
};

type ActionsBarProps = {
  buttons: Button[];
};

export default function ActionsBar({ buttons }: ActionsBarProps) {
  return (
    <div>
      {buttons.map((btn) => (
        <button
          key={btn.label}
          onClick={btn.onClick}
          className="mr-2 px-4 py-2 bg-blue-600 text-white rounded"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
