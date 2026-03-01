import { Check } from "lucide-react";

interface Step {
  n: number;
  label: string;
}

const steps: Step[] = [
  { n: 1, label: "Calculadora Price" },
  { n: 2, label: "Consulta BACEN" },
  { n: 3, label: "Planilha Revisional" },
  { n: 4, label: "Valores a Receber" },
  { n: 5, label: "Documentos" },
];

interface StepperNavProps {
  current: number;
  onStep: (n: number) => void;
}

export function StepperNav({ current, onStep }: StepperNavProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8 overflow-x-auto pb-2">
      {steps.map((s, i) => {
        const done = current > s.n;
        const active = current === s.n;
        return (
          <div key={s.n} className="flex items-center">
            <button
              onClick={() => onStep(s.n)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                active
                  ? "bg-sidebar text-white shadow-md"
                  : done
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                active ? "bg-white/20 text-white" : done ? "bg-success text-white" : "bg-muted-foreground/10"
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div className={`w-6 sm:w-10 h-0.5 mx-0.5 ${done ? "bg-success" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
