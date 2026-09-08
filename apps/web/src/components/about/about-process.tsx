export interface ProcessStep {
  title: string;
  body: string;
}

/**
 * How a listing reaches the site, as an ordered list.
 *
 * The visual treatment is a horizontal track on desktop and a vertical one on
 * mobile, but the markup is an ordered list either way: the order is the
 * meaning, so it has to survive with the styling switched off and be announced
 * as a numbered sequence. The connecting rules are decorative and hidden from
 * assistive technology; the step numbers are real text, not images.
 */
export function AboutProcess({ steps }: { steps: ProcessStep[] }) {
  return (
    <ol className="mt-10 grid gap-4 md:grid-cols-5">
      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-4 rounded-card-lg border border-border bg-surface-raised p-6 shadow-sm md:flex-col md:gap-3">
          <span aria-hidden="true" className="font-display flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-base font-semibold text-sky-700 ring-1 ring-sky-500/15">
            {index + 1}
          </span>
          <div>
            <h3 className="text-base font-semibold tracking-tight">
              <span className="sr-only">Step {index + 1}: </span>
              {step.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{step.body}</p>
          </div>
          {index < steps.length - 1 && (
            <span aria-hidden="true" className="pointer-events-none absolute -bottom-4 left-9 h-4 w-px bg-border-strong md:-right-4 md:bottom-auto md:left-auto md:top-9 md:h-px md:w-4" />
          )}
        </li>
      ))}
    </ol>
  );
}
